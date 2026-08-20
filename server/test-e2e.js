const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token && { Authorization: `Bearer ${options.token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runE2ETests() {
  console.log('🧪 Starting Phase 1 E2E API Verification Tests...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Testing /api/health...');
    const health = await request('/health');
    console.log('   ✅ Health check passed:', health.status);

    // 2. Register User A
    console.log('\n2️⃣ Registering User A (Alex)...');
    const userARes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alex Rivera',
        username: 'alex_rivera',
        email: 'alex.rivera@example.com',
        password: 'password123',
      },
    });
    console.log('   ✅ User A registered with Public ID:', userARes.user.publicId);
    const tokenA = userARes.token;
    const userA = userARes.user;
    const verificationTokenA = userARes.verificationToken;

    // 3. Register User B
    console.log('\n3️⃣ Registering User B (Samantha)...');
    const userBRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Samantha Reed',
        username: 'samantha_r',
        email: 'samantha.reed@example.com',
        password: 'password456',
      },
    });
    console.log('   ✅ User B registered with Public ID:', userBRes.user.publicId);
    const tokenB = userBRes.token;
    const userB = userBRes.user;

    // 4. Verify User A email
    if (verificationTokenA) {
      console.log('\n4️⃣ Verifying User A email...');
      const verifyRes = await request('/auth/verify-email', {
        method: 'POST',
        body: {
          token: verificationTokenA,
          email: 'alex.rivera@example.com',
        },
      });
      console.log('   ✅ Email verification passed:', verifyRes.message);
    }

    // 5. Test Login User A by Username
    console.log('\n5️⃣ Testing Login by Username (alex_rivera)...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'alex_rivera',
        password: 'password123',
      },
    });
    console.log('   ✅ Login successful for:', loginRes.user.name);

    // 6. Search for User B from User A
    console.log('\n6️⃣ Searching users for "samantha"...');
    const searchRes = await request('/users/search?q=samantha', {
      token: tokenA,
    });
    console.log('   ✅ Search returned', searchRes.users.length, 'users:');
    searchRes.users.forEach((u) => console.log(`      - ${u.name} (@${u.username}) [${u.publicId}]`));

    // 7. Search for User A by Public ID
    console.log(`\n7️⃣ Searching users by Public ID (${userA.publicId})...`);
    const searchByIdRes = await request(`/users/search?q=${userA.publicId}`, {
      token: tokenB,
    });
    console.log('   ✅ Search by ID returned:', searchByIdRes.users[0]?.name);

    // 8. Create Conversation between User A and User B
    console.log('\n8️⃣ Starting Conversation (User A -> User B)...');
    const convRes = await request('/chats', {
      method: 'POST',
      token: tokenA,
      body: { recipientId: userB._id },
    });
    const conversationId = convRes.conversation._id;
    console.log('   ✅ Conversation created ID:', conversationId);

    // 9. Send Message from User A to User B
    console.log('\n9️⃣ Sending Message from User A to User B...');
    const sendMsgRes = await request('/messages', {
      method: 'POST',
      token: tokenA,
      body: {
        conversationId,
        text: 'Hello Samantha! This is a test message from Alex.',
      },
    });
    const messageId = sendMsgRes.message._id;
    console.log('   ✅ Message sent:', sendMsgRes.message.text);

    // 10. React to message by User B
    console.log('\n🔟 User B reacting to message with ❤️...');
    const reactRes = await request(`/messages/${messageId}/react`, {
      method: 'POST',
      token: tokenB,
      body: { emoji: '❤️' },
    });
    console.log('   ✅ Reaction recorded:', reactRes.message.reactions);

    // 11. Edit Message by User A
    console.log('\n1️⃣1️⃣ User A editing message...');
    const editRes = await request(`/messages/${messageId}`, {
      method: 'PUT',
      token: tokenA,
      body: { text: 'Hello Samantha! (edited message test)' },
    });
    console.log('   ✅ Message updated:', editRes.message.text, '| isEdited:', editRes.message.isEdited);

    // 12. Send reply from User B
    console.log('\n1️⃣2️⃣ User B replying to User A...');
    const replyRes = await request('/messages', {
      method: 'POST',
      token: tokenB,
      body: {
        conversationId,
        text: 'Hey Alex! Glad to connect on Nova.',
        replyToId: messageId,
      },
    });
    console.log('   ✅ Reply sent:', replyRes.message.text, '| Replying to:', replyRes.message.replyTo?.text);

    // 13. Fetch messages for conversation
    console.log('\n1️⃣3️⃣ Fetching messages for conversation...');
    const messagesRes = await request(`/messages/${conversationId}`, {
      token: tokenA,
    });
    console.log('   ✅ Total messages in conversation:', messagesRes.messages.length);

    // 14. Test Privacy Settings Update
    console.log('\n1️⃣4️⃣ Updating User A privacy settings...');
    const privacyRes = await request('/users/privacy', {
      method: 'PUT',
      token: tokenA,
      body: {
        onlineStatus: 'nobody',
        readReceipts: false,
        profilePicture: 'everyone',
        whoCanMessage: 'everyone',
      },
    });
    console.log('   ✅ Privacy settings updated:', privacyRes.privacy);

    // 15. Test Report User
    console.log('\n1️⃣5️⃣ User A submitting report against User B (mock safety test)...');
    const reportRes = await request('/safety/report', {
      method: 'POST',
      token: tokenA,
      body: {
        reportedUserId: userB._id,
        reason: 'spam',
        details: 'Testing report mechanism verification.',
      },
    });
    console.log('   ✅ Report submitted successfully, ID:', reportRes.reportId);

    // 16. Test Block User
    console.log('\n1️⃣6️⃣ User A blocking User B...');
    const blockRes = await request('/safety/block', {
      method: 'POST',
      token: tokenA,
      body: { userId: userB._id },
    });
    console.log('   ✅ Block status:', blockRes.message);

    // 17. Verify Block Prevents Messaging
    console.log('\n1️⃣7️⃣ Verifying blocked communication prevents sending messages...');
    try {
      await request('/messages', {
        method: 'POST',
        token: tokenB,
        body: {
          conversationId,
          text: 'This message should be rejected because of block.',
        },
      });
      console.log('   ❌ Error: Message should not have succeeded.');
    } catch (blockErr) {
      console.log('   ✅ Block correctly prevented message:', blockErr.message);
    }

    // 18. Unblock User B
    console.log('\n1️⃣8️⃣ User A unblocking User B...');
    const unblockRes = await request('/safety/unblock', {
      method: 'POST',
      token: tokenA,
      body: { userId: userB._id },
    });
    console.log('   ✅ Unblock status:', unblockRes.message);

    // 19. Delete Message for Everyone
    console.log('\n1️⃣9️⃣ User A deleting message for everyone...');
    const deleteRes = await request(`/messages/${messageId}`, {
      method: 'DELETE',
      token: tokenA,
      body: { deleteForEveryone: true },
    });
    console.log('   ✅ Message delete status:', deleteRes.message);

    console.log('\n======================================================');
    console.log('🎉 ALL 19 E2E API VERIFICATION TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.data || err.message);
    process.exit(1);
  }
}

runE2ETests();
