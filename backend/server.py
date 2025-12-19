import os
import uuid
import re
import json
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from dotenv import load_dotenv
import random
import string
import httpx

load_dotenv()

app = FastAPI(title="TaskPulse API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/taskpulse")
client = MongoClient(MONGO_URL)
db = client.get_database("taskpulse")

# Collections
users_collection = db["users"]
tasks_collection = db["tasks"]
notifications_collection = db["notifications"]
settings_collection = db["settings"]

# ============== ENUMS/CONSTANTS ==============
class UserRole:
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class UserStatus:
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    PENDING_APPROVAL = "PENDING_APPROVAL"

class TaskStatus:
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    VERIFIED = "VERIFIED"

class TaskPriority:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class Recurrence:
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"

# ============== PYDANTIC MODELS ==============

class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    completed: bool = False

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    text: str
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    image: Optional[str] = None

class Location(BaseModel):
    lat: float
    lng: float

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str = UserRole.EMPLOYEE
    status: str = UserStatus.ACTIVE
    avatar: Optional[str] = None
    initials: str = ""
    phoneNumber: str
    department: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    role: str = UserRole.EMPLOYEE
    phoneNumber: str
    department: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phoneNumber: Optional[str] = None
    department: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    assignedTo: str
    createdBy: str
    dueDate: str
    priority: str = TaskPriority.MEDIUM
    status: str = TaskStatus.TODO
    recurrence: str = Recurrence.NONE
    recurrenceDays: List[int] = []
    recurrenceEndDate: Optional[str] = None
    location: Optional[str] = None
    requireLocation: bool = False
    completionLocation: Optional[Location] = None
    referencePhoto: Optional[str] = None
    requirePhotoProof: bool = False
    photoProof: Optional[str] = None
    checklist: List[ChecklistItem] = []
    comments: List[Comment] = []
    createdAt: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    assignedTo: str
    createdBy: str
    dueDate: str
    priority: str = TaskPriority.MEDIUM
    recurrence: str = Recurrence.NONE
    recurrenceDays: List[int] = []
    recurrenceEndDate: Optional[str] = None
    location: Optional[str] = None
    requireLocation: bool = False
    requirePhotoProof: bool = False
    checklist: List[ChecklistItem] = []

class TaskStatusUpdate(BaseModel):
    status: str
    photoProof: Optional[str] = None
    completionLocation: Optional[Location] = None

class CommentCreate(BaseModel):
    userId: str
    text: str
    image: Optional[str] = None

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    title: str
    message: str
    type: str  # TASK_ASSIGNED, TASK_COMPLETED, COMMENT, SYSTEM
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    read: bool = False
    taskId: Optional[str] = None

class Settings(BaseModel):
    companyCode: str = "TEAM2025"
    isInviteEnabled: bool = True

class OTPRequest(BaseModel):
    phoneNumber: str

class OTPVerify(BaseModel):
    phoneNumber: str
    otp: str

class JoinTeamRequest(BaseModel):
    name: str
    phoneNumber: str
    companyCode: str

# ============== HELPER FUNCTIONS ==============

def get_initials(name: str) -> str:
    parts = name.split()
    return "".join([p[0] for p in parts[:2]]).upper()

def create_notification(user_id: str, title: str, message: str, notif_type: str, task_id: Optional[str] = None):
    notif = Notification(
        userId=user_id,
        title=title,
        message=message,
        type=notif_type,
        taskId=task_id
    )
    notifications_collection.insert_one(notif.model_dump())

def get_settings() -> dict:
    settings = settings_collection.find_one({"_id": "app_settings"})
    if not settings:
        default_settings = {"_id": "app_settings", "companyCode": "TEAM2025", "isInviteEnabled": True}
        settings_collection.insert_one(default_settings)
        return default_settings
    return settings

# ============== SEED DATA ==============

def seed_initial_data():
    """Seed initial data if database is empty"""
    if users_collection.count_documents({}) == 0:
        # Create default users
        default_users = [
            User(id="u1", name="Alice Owner", role=UserRole.OWNER, status=UserStatus.ACTIVE, 
                 initials="AO", phoneNumber="5550001", department="Management"),
            User(id="u2", name="Bob Barista", role=UserRole.EMPLOYEE, status=UserStatus.ACTIVE,
                 initials="BB", phoneNumber="5550002", department="Front of House"),
            User(id="u3", name="Charlie Chef", role=UserRole.EMPLOYEE, status=UserStatus.ACTIVE,
                 initials="CC", phoneNumber="5550003", department="Kitchen"),
            User(id="u4", name="Dana Driver", role=UserRole.EMPLOYEE, status=UserStatus.ACTIVE,
                 initials="DD", phoneNumber="5550004", department="Logistics"),
        ]
        for user in default_users:
            users_collection.insert_one(user.model_dump())
        
        # Create sample tasks
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = datetime.now().strftime("%Y-%m-%d")
        
        sample_tasks = [
            Task(
                id="t1",
                title="Open the store",
                description="Unlock front doors, turn on lights, start coffee machine.",
                assignedTo="u2",
                createdBy="u1",
                dueDate=today,
                priority=TaskPriority.HIGH,
                status=TaskStatus.TODO,
                recurrence=Recurrence.DAILY,
                checklist=[
                    ChecklistItem(id="c1", text="Unlock doors", completed=False),
                    ChecklistItem(id="c2", text="Lights on", completed=False),
                    ChecklistItem(id="c3", text="Music on", completed=False)
                ]
            ),
            Task(
                id="t2",
                title="Inventory Check",
                description="Count the stock in the back room and update the sheet.",
                assignedTo="u3",
                createdBy="u1",
                dueDate=tomorrow,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.IN_PROGRESS,
                recurrence=Recurrence.WEEKLY
            )
        ]
        for task in sample_tasks:
            tasks_collection.insert_one(task.model_dump())
        
        # Create sample notifications
        sample_notifs = [
            Notification(id="n1", userId="u2", title="New Task Assigned", 
                        message='Alice assigned you "Open the store"', type="TASK_ASSIGNED", taskId="t1"),
            Notification(id="n2", userId="u1", title="Task Completed",
                        message='Bob completed "Morning Prep"', type="TASK_COMPLETED", read=True),
            Notification(id="n3", userId="u3", title="New Comment",
                        message="Charlie commented on your task", type="COMMENT", taskId="t2"),
        ]
        for notif in sample_notifs:
            notifications_collection.insert_one(notif.model_dump())

# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/send-otp")
async def send_otp(request: OTPRequest):
    """Simulate sending OTP to phone number"""
    # In production, integrate with SMS service like Twilio
    return {"success": True, "message": "OTP sent", "otp": "123456"}  # Demo OTP

@app.post("/api/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    """Verify OTP and return user if exists"""
    if request.otp != "123456":  # Demo OTP
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user = users_collection.find_one({"phoneNumber": request.phoneNumber})
    if user:
        user.pop("_id", None)
        return {"success": True, "user": user, "isNewUser": False}
    
    return {"success": True, "user": None, "isNewUser": True}

@app.post("/api/auth/join-team")
async def join_team(request: JoinTeamRequest):
    """Join team with company code"""
    settings = get_settings()
    
    if not settings.get("isInviteEnabled"):
        raise HTTPException(status_code=400, detail="Team invites are currently disabled")
    
    if request.companyCode.upper() != settings.get("companyCode", "").upper():
        raise HTTPException(status_code=400, detail="Invalid company code")
    
    # Check if user already exists
    existing = users_collection.find_one({"phoneNumber": request.phoneNumber})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    new_user = User(
        name=request.name,
        phoneNumber=request.phoneNumber,
        role=UserRole.EMPLOYEE,
        status=UserStatus.PENDING_APPROVAL,
        initials=get_initials(request.name)
    )
    users_collection.insert_one(new_user.model_dump())
    
    return {"success": True, "user": new_user.model_dump()}

# ============== USER ENDPOINTS ==============

@app.get("/api/users", response_model=List[dict])
async def get_users():
    """Get all users"""
    users = list(users_collection.find({}))
    for user in users:
        user.pop("_id", None)
    return users

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    user = users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop("_id", None)
    return user

@app.post("/api/users")
async def create_user(user_data: UserCreate):
    """Create new user (invite)"""
    new_user = User(
        name=user_data.name,
        role=user_data.role,
        phoneNumber=user_data.phoneNumber,
        department=user_data.department,
        status=UserStatus.INVITED,
        initials=get_initials(user_data.name)
    )
    users_collection.insert_one(new_user.model_dump())
    return new_user.model_dump()

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate):
    """Update user"""
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    
    if "name" in update_dict:
        update_dict["initials"] = get_initials(update_dict["name"])
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = users_collection.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_collection.find_one({"id": user_id})
    user.pop("_id", None)
    return user

@app.put("/api/users/{user_id}/approve")
async def approve_user(user_id: str):
    """Approve pending user"""
    result = users_collection.update_one(
        {"id": user_id, "status": UserStatus.PENDING_APPROVAL},
        {"$set": {"status": UserStatus.ACTIVE}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found or not pending")
    
    user = users_collection.find_one({"id": user_id})
    user.pop("_id", None)
    return user

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, delete_tasks: bool = Query(False)):
    """Delete user and optionally their tasks"""
    result = users_collection.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    if delete_tasks:
        tasks_collection.delete_many({"assignedTo": user_id})
    
    return {"success": True}

# ============== TASK ENDPOINTS ==============

@app.get("/api/tasks", response_model=List[dict])
async def get_tasks(user_id: Optional[str] = None, role: Optional[str] = None):
    """Get tasks - managers see all, employees see assigned/created"""
    query = {}
    
    if role in [UserRole.MANAGER, UserRole.OWNER]:
        pass  # See all tasks
    elif user_id:
        query = {"$or": [{"assignedTo": user_id}, {"createdBy": user_id}]}
    
    tasks = list(tasks_collection.find(query))
    for task in tasks:
        task.pop("_id", None)
    return tasks

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task by ID"""
    task = tasks_collection.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.pop("_id", None)
    return task

@app.post("/api/tasks")
async def create_task(task_data: TaskCreate):
    """Create new task"""
    new_task = Task(**task_data.model_dump())
    tasks_collection.insert_one(new_task.model_dump())
    
    # Create notification for assignee
    creator = users_collection.find_one({"id": task_data.createdBy})
    creator_name = creator["name"] if creator else "Someone"
    create_notification(
        task_data.assignedTo,
        "New Task Assigned",
        f'{creator_name} assigned you "{task_data.title}"',
        "TASK_ASSIGNED",
        new_task.id
    )
    
    return new_task.model_dump()

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, task_data: dict):
    """Update task"""
    task_data.pop("id", None)
    task_data.pop("_id", None)
    
    result = tasks_collection.update_one({"id": task_id}, {"$set": task_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_collection.find_one({"id": task_id})
    task.pop("_id", None)
    return task

@app.put("/api/tasks/{task_id}/status")
async def update_task_status(task_id: str, status_data: TaskStatusUpdate):
    """Update task status with optional photo proof and location"""
    update_dict = {"status": status_data.status}
    
    if status_data.photoProof:
        update_dict["photoProof"] = status_data.photoProof
    if status_data.completionLocation:
        update_dict["completionLocation"] = status_data.completionLocation.model_dump()
    
    result = tasks_collection.update_one({"id": task_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Create notification if task is completed
    if status_data.status == TaskStatus.COMPLETED:
        task = tasks_collection.find_one({"id": task_id})
        assignee = users_collection.find_one({"id": task["assignedTo"]})
        assignee_name = assignee["name"] if assignee else "Someone"
        create_notification(
            task["createdBy"],
            "Task Completed",
            f'{assignee_name} completed "{task["title"]}"',
            "TASK_COMPLETED",
            task_id
        )
    
    task = tasks_collection.find_one({"id": task_id})
    task.pop("_id", None)
    return task

@app.post("/api/tasks/{task_id}/comments")
async def add_comment(task_id: str, comment_data: CommentCreate):
    """Add comment to task"""
    task = tasks_collection.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_comment = Comment(
        userId=comment_data.userId,
        text=comment_data.text,
        image=comment_data.image
    )
    
    # Update task status to IN_PROGRESS if currently TODO
    update_dict = {"$push": {"comments": new_comment.model_dump()}}
    if task["status"] == TaskStatus.TODO:
        update_dict["$set"] = {"status": TaskStatus.IN_PROGRESS}
    
    tasks_collection.update_one({"id": task_id}, update_dict)
    
    # Create notification
    commenter = users_collection.find_one({"id": comment_data.userId})
    commenter_name = commenter["name"] if commenter else "Someone"
    
    # Notify task creator and assignee (except the commenter)
    notify_users = {task["createdBy"], task["assignedTo"]} - {comment_data.userId}
    for user_id in notify_users:
        create_notification(
            user_id,
            "New Comment",
            f'{commenter_name} commented on "{task["title"]}"',
            "COMMENT",
            task_id
        )
    
    updated_task = tasks_collection.find_one({"id": task_id})
    updated_task.pop("_id", None)
    return updated_task

@app.put("/api/tasks/{task_id}/checklist/{item_id}")
async def toggle_checklist_item(task_id: str, item_id: str):
    """Toggle checklist item completion"""
    task = tasks_collection.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    checklist = task.get("checklist", [])
    for item in checklist:
        if item["id"] == item_id:
            item["completed"] = not item["completed"]
            break
    
    # Update status to IN_PROGRESS if currently TODO
    new_status = TaskStatus.IN_PROGRESS if task["status"] == TaskStatus.TODO else task["status"]
    
    tasks_collection.update_one(
        {"id": task_id},
        {"$set": {"checklist": checklist, "status": new_status}}
    )
    
    updated_task = tasks_collection.find_one({"id": task_id})
    updated_task.pop("_id", None)
    return updated_task

# ============== NOTIFICATION ENDPOINTS ==============

@app.get("/api/notifications", response_model=List[dict])
async def get_notifications(user_id: str):
    """Get notifications for user"""
    notifications = list(notifications_collection.find({"userId": user_id}).sort("timestamp", -1))
    for notif in notifications:
        notif.pop("_id", None)
    return notifications

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    result = notifications_collection.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@app.put("/api/notifications/read-all")
async def mark_all_notifications_read(user_id: str):
    """Mark all notifications as read for user"""
    notifications_collection.update_many(
        {"userId": user_id},
        {"$set": {"read": True}}
    )
    return {"success": True}

# ============== SETTINGS ENDPOINTS ==============

@app.get("/api/settings")
async def get_app_settings():
    """Get app settings"""
    settings = get_settings()
    settings.pop("_id", None)
    return settings

@app.post("/api/settings/regenerate-code")
async def regenerate_company_code():
    """Regenerate company invite code"""
    new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    settings_collection.update_one(
        {"_id": "app_settings"},
        {"$set": {"companyCode": new_code}},
        upsert=True
    )
    return {"companyCode": new_code}

@app.put("/api/settings/invite-enabled")
async def toggle_invite_enabled(enabled: bool):
    """Toggle invite enabled status"""
    settings_collection.update_one(
        {"_id": "app_settings"},
        {"$set": {"isInviteEnabled": enabled}},
        upsert=True
    )
    return {"isInviteEnabled": enabled}

# ============== AI ENDPOINTS ==============

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
EMERGENT_PROXY_URL = "https://integrations.emergentagent.com/api/providers/google/v1beta"

class AIRequest(BaseModel):
    messages: List[dict]
    systemInstruction: Optional[str] = None
    tools: Optional[List[dict]] = None

class TaskExpansionRequest(BaseModel):
    title: str

class ProductivityAnalysisRequest(BaseModel):
    tasks: List[dict]

@app.post("/api/ai/chat")
async def ai_chat(request: AIRequest):
    """Proxy AI chat request to Emergent integration"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    request_body = {
        "contents": request.messages,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        }
    }
    
    if request.systemInstruction:
        request_body["systemInstruction"] = {
            "parts": [{"text": request.systemInstruction}]
        }
    
    if request.tools:
        request_body["tools"] = request.tools
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{EMERGENT_PROXY_URL}/models/gemini-2.0-flash:generateContent",
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": EMERGENT_LLM_KEY,
                },
                json=request_body,
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(status_code=response.status_code, detail=error_data.get("error", {}).get("message", "AI API error"))
            
            return response.json()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AI service timeout")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/expand-task")
async def expand_task(request: TaskExpansionRequest):
    """Expand a task title into description and checklist"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    prompt = f"""Create a detailed task description and a checklist of 3-5 subtasks for a small business task titled: "{request.title}". 
Keep it professional and concise.

Return your response in this exact JSON format:
{{
  "description": "A clear, actionable description of the task",
  "checklist": ["Step 1", "Step 2", "Step 3"]
}}"""

    request_body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 512,
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{EMERGENT_PROXY_URL}/models/gemini-2.0-flash:generateContent",
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": EMERGENT_LLM_KEY,
                },
                json=request_body,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {"description": "", "checklist": []}
            
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group(0))
            return {"description": "", "checklist": []}
        except Exception as e:
            print(f"Task expansion error: {e}")
            return {"description": "", "checklist": []}

@app.post("/api/ai/analyze-productivity")
async def analyze_productivity(request: ProductivityAnalysisRequest):
    """Analyze team productivity from tasks"""
    if not EMERGENT_LLM_KEY:
        return {"summary": "AI analysis requires configuration."}
    
    task_summary = [{"title": t.get("title"), "status": t.get("status"), "priority": t.get("priority")} for t in request.tasks]
    
    prompt = f"""Analyze this list of tasks and provide a 2-sentence motivational summary for the manager about the team's current workload and progress. Keep it positive and actionable.

Tasks: {task_summary}"""

    request_body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 256,
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{EMERGENT_PROXY_URL}/models/gemini-2.0-flash:generateContent",
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": EMERGENT_LLM_KEY,
                },
                json=request_body,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {"summary": "Unable to generate analysis."}
            
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return {"summary": text or "Keep up the good work!"}
        except Exception as e:
            print(f"Productivity analysis error: {e}")
            return {"summary": "Unable to generate analysis."}

# ============== HEALTH CHECK ==============

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "TaskPulse API"}

# ============== STARTUP ==============

@app.on_event("startup")
async def startup_event():
    """Initialize database with seed data"""
    seed_initial_data()
    print("TaskPulse API started successfully!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
