#!/usr/bin/env python3
"""
Backend test suite for Royal Chess Online - In-Game Chat Feature
Tests ONLY the two new chat endpoints:
- POST /api/online/rooms/{room_code}/chat
- GET /api/online/rooms/{room_code}/chat
"""

import requests
import json
from typing import Optional

BASE_URL = "http://localhost:8001/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name: str):
    print(f"\n{Colors.BLUE}🧪 TEST: {name}{Colors.END}")

def print_pass(msg: str):
    print(f"{Colors.GREEN}✅ PASS: {msg}{Colors.END}")

def print_fail(msg: str):
    print(f"{Colors.RED}❌ FAIL: {msg}{Colors.END}")

def print_info(msg: str):
    print(f"{Colors.YELLOW}ℹ️  INFO: {msg}{Colors.END}")

# Helper functions
def create_room(token: Optional[str] = None) -> dict:
    """Create a new room and return room data"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    response = requests.post(
        f"{BASE_URL}/online/rooms/create",
        json={"color_preference": "white", "time_minutes": 10},
        headers=headers
    )
    if response.status_code != 200:
        raise Exception(f"Failed to create room: {response.status_code} - {response.text}")
    return response.json()

def login_demo_user() -> str:
    """Login as demo user and return token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "chessplayer@gmail.com", "password": "password123"}
    )
    if response.status_code != 200:
        raise Exception(f"Failed to login: {response.status_code} - {response.text}")
    return response.json()["token"]

# Test Suite
def test_anonymous_message():
    """Test sending a message without authentication"""
    print_test("Send anonymous message (no Authorization header)")
    
    try:
        room = create_room()
        room_code = room["room_code"]
        print_info(f"Created room: {room_code}")
        
        # Send message without auth
        response = requests.post(
            f"{BASE_URL}/online/rooms/{room_code}/chat",
            json={"text": "Hello from anonymous user!"}
        )
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        
        # Verify response structure
        required_fields = ["id", "sender_id", "sender_name", "text", "created_at"]
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing field '{field}' in response")
                return False
        
        # Verify anonymous defaults
        if data["sender_id"] != "guest":
            print_fail(f"Expected sender_id='guest', got '{data['sender_id']}'")
            return False
        
        if data["sender_name"] != "Player":
            print_fail(f"Expected sender_name='Player', got '{data['sender_name']}'")
            return False
        
        if data["text"] != "Hello from anonymous user!":
            print_fail(f"Text mismatch: {data['text']}")
            return False
        
        print_pass(f"Anonymous message sent successfully with defaults (sender_id='{data['sender_id']}', sender_name='{data['sender_name']}')")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def test_authenticated_message():
    """Test sending a message with authentication"""
    print_test("Send authenticated message (with Bearer token)")
    
    try:
        # Login first
        token = login_demo_user()
        print_info("Logged in as demo user (chessplayer@gmail.com)")
        
        # Create room
        room = create_room(token)
        room_code = room["room_code"]
        print_info(f"Created room: {room_code}")
        
        # Send message with auth
        response = requests.post(
            f"{BASE_URL}/online/rooms/{room_code}/chat",
            json={"text": "Hello from ChessPlayer!"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        
        # Verify authenticated user details
        if data["sender_id"] != "user_demo_chessplayer":
            print_fail(f"Expected sender_id='user_demo_chessplayer', got '{data['sender_id']}'")
            return False
        
        if data["sender_name"] != "ChessPlayer":
            print_fail(f"Expected sender_name='ChessPlayer', got '{data['sender_name']}'")
            return False
        
        print_pass(f"Authenticated message sent successfully (sender_id='{data['sender_id']}', sender_name='{data['sender_name']}')")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def test_get_messages_chronological():
    """Test GET messages returns them in chronological order"""
    print_test("GET messages in chronological order")
    
    try:
        room = create_room()
        room_code = room["room_code"]
        print_info(f"Created room: {room_code}")
        
        # Send multiple messages
        messages_sent = []
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/online/rooms/{room_code}/chat",
                json={"text": f"Message {i+1}"}
            )
            if response.status_code != 200:
                print_fail(f"Failed to send message {i+1}: {response.status_code}")
                return False
            messages_sent.append(response.json())
        
        print_info(f"Sent {len(messages_sent)} messages")
        
        # GET messages
        response = requests.get(f"{BASE_URL}/online/rooms/{room_code}/chat")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        messages = response.json()
        
        if not isinstance(messages, list):
            print_fail(f"Expected list, got {type(messages)}")
            return False
        
        if len(messages) != 3:
            print_fail(f"Expected 3 messages, got {len(messages)}")
            return False
        
        # Verify chronological order
        for i, msg in enumerate(messages):
            if msg["text"] != f"Message {i+1}":
                print_fail(f"Message {i} text mismatch: expected 'Message {i+1}', got '{msg['text']}'")
                return False
        
        print_pass(f"Retrieved {len(messages)} messages in correct chronological order")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def test_empty_text_validation():
    """Test that empty/whitespace text returns 400"""
    print_test("Empty/whitespace text validation (should return 400)")
    
    try:
        room = create_room()
        room_code = room["room_code"]
        print_info(f"Created room: {room_code}")
        
        # Test empty string
        response = requests.post(
            f"{BASE_URL}/online/rooms/{room_code}/chat",
            json={"text": ""}
        )
        
        if response.status_code != 400:
            print_fail(f"Empty text: Expected 400, got {response.status_code}")
            return False
        
        print_info("Empty text correctly rejected with 400")
        
        # Test whitespace only
        response = requests.post(
            f"{BASE_URL}/online/rooms/{room_code}/chat",
            json={"text": "   "}
        )
        
        if response.status_code != 400:
            print_fail(f"Whitespace text: Expected 400, got {response.status_code}")
            return False
        
        print_info("Whitespace-only text correctly rejected with 400")
        
        print_pass("Empty/whitespace validation working correctly")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def test_unknown_room_404():
    """Test that unknown room code returns 404"""
    print_test("Unknown room code returns 404")
    
    try:
        unknown_room = "ZZZZZZ"
        
        # Test POST to unknown room
        response = requests.post(
            f"{BASE_URL}/online/rooms/{unknown_room}/chat",
            json={"text": "Hello"}
        )
        
        if response.status_code != 404:
            print_fail(f"POST to unknown room: Expected 404, got {response.status_code}")
            return False
        
        print_info("POST to unknown room correctly returns 404")
        
        # Test GET from unknown room
        response = requests.get(f"{BASE_URL}/online/rooms/{unknown_room}/chat")
        
        if response.status_code != 404:
            print_fail(f"GET from unknown room: Expected 404, got {response.status_code}")
            return False
        
        print_info("GET from unknown room correctly returns 404")
        
        print_pass("Unknown room validation working correctly")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def test_text_length_trimming():
    """Test that text longer than 500 chars is trimmed to exactly 500"""
    print_test("Text longer than 500 characters is trimmed to 500")
    
    try:
        room = create_room()
        room_code = room["room_code"]
        print_info(f"Created room: {room_code}")
        
        # Create a 600-character message
        long_text = "A" * 600
        
        response = requests.post(
            f"{BASE_URL}/online/rooms/{room_code}/chat",
            json={"text": long_text}
        )
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        
        if len(data["text"]) != 500:
            print_fail(f"Expected text length 500, got {len(data['text'])}")
            return False
        
        if data["text"] != "A" * 500:
            print_fail("Trimmed text content mismatch")
            return False
        
        print_pass(f"Text correctly trimmed from 600 to 500 characters")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def test_room_message_isolation():
    """Test that messages are scoped per room"""
    print_test("Messages are scoped per room (room A messages don't appear in room B)")
    
    try:
        # Create two rooms
        room_a = create_room()
        room_code_a = room_a["room_code"]
        print_info(f"Created room A: {room_code_a}")
        
        room_b = create_room()
        room_code_b = room_b["room_code"]
        print_info(f"Created room B: {room_code_b}")
        
        # Send messages to room A
        for i in range(2):
            response = requests.post(
                f"{BASE_URL}/online/rooms/{room_code_a}/chat",
                json={"text": f"Room A message {i+1}"}
            )
            if response.status_code != 200:
                print_fail(f"Failed to send message to room A: {response.status_code}")
                return False
        
        print_info("Sent 2 messages to room A")
        
        # Send messages to room B
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/online/rooms/{room_code_b}/chat",
                json={"text": f"Room B message {i+1}"}
            )
            if response.status_code != 200:
                print_fail(f"Failed to send message to room B: {response.status_code}")
                return False
        
        print_info("Sent 3 messages to room B")
        
        # GET messages from room A
        response_a = requests.get(f"{BASE_URL}/online/rooms/{room_code_a}/chat")
        if response_a.status_code != 200:
            print_fail(f"Failed to get messages from room A: {response_a.status_code}")
            return False
        
        messages_a = response_a.json()
        
        # GET messages from room B
        response_b = requests.get(f"{BASE_URL}/online/rooms/{room_code_b}/chat")
        if response_b.status_code != 200:
            print_fail(f"Failed to get messages from room B: {response_b.status_code}")
            return False
        
        messages_b = response_b.json()
        
        # Verify room A has only 2 messages
        if len(messages_a) != 2:
            print_fail(f"Room A: Expected 2 messages, got {len(messages_a)}")
            return False
        
        # Verify room B has only 3 messages
        if len(messages_b) != 3:
            print_fail(f"Room B: Expected 3 messages, got {len(messages_b)}")
            return False
        
        # Verify room A messages don't contain room B text
        for msg in messages_a:
            if "Room B" in msg["text"]:
                print_fail(f"Room A contains Room B message: {msg['text']}")
                return False
        
        # Verify room B messages don't contain room A text
        for msg in messages_b:
            if "Room A" in msg["text"]:
                print_fail(f"Room B contains Room A message: {msg['text']}")
                return False
        
        print_pass(f"Messages correctly isolated (Room A: {len(messages_a)} msgs, Room B: {len(messages_b)} msgs)")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*70}")
    print("🎮 Royal Chess Online - In-Game Chat Backend Tests")
    print(f"{'='*70}{Colors.END}\n")
    
    tests = [
        ("Anonymous Message", test_anonymous_message),
        ("Authenticated Message", test_authenticated_message),
        ("GET Messages Chronological", test_get_messages_chronological),
        ("Empty Text Validation", test_empty_text_validation),
        ("Unknown Room 404", test_unknown_room_404),
        ("Text Length Trimming", test_text_length_trimming),
        ("Room Message Isolation", test_room_message_isolation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_fail(f"Test '{name}' crashed: {str(e)}")
            results.append((name, False))
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*70}")
    print("📊 TEST SUMMARY")
    print(f"{'='*70}{Colors.END}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"{status} - {name}")
    
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    if passed == total:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED ({passed}/{total}){Colors.END}")
    else:
        print(f"{Colors.RED}⚠️  SOME TESTS FAILED ({passed}/{total} passed){Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
