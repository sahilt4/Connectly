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

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2 E2E API Verification Tests...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Testing /api/health...');
    const health = await request('/health');
    console.log('   ✅ Health check passed:', health.service);

    // 2. Register Test User 1
    console.log('\n2️⃣ Registering User 1 (Alice)...');
    const user1Res = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Cooper',
        username: 'alice_c_' + Date.now().toString().slice(-4),
        email: `alice_${Date.now()}@example.com`,
        password: 'password123',
      },
    });
    const token1 = user1Res.token;
    const user1 = user1Res.user;
    console.log('   ✅ Alice registered:', user1.username, 'ID:', user1.publicId);

    // 3. Register Test User 2
    console.log('\n3️⃣ Registering User 2 (Bob)...');
    const user2Res = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Bob Miller',
        username: 'bob_m_' + Date.now().toString().slice(-4),
        email: `bob_${Date.now()}@example.com`,
        password: 'password123',
      },
    });
    const token2 = user2Res.token;
    const user2 = user2Res.user;
    console.log('   ✅ Bob registered:', user2.username, 'ID:', user2.publicId);

    // 4. Update Profile with Bio and Custom Status
    console.log('\n4️⃣ Testing Profile Enhancements (Bio & Status)...');
    const profileRes = await request('/users/profile', {
      method: 'PUT',
      token: token1,
      body: {
        bio: 'Building awesome apps with Nova!',
        customStatus: 'Coding Phase 2',
        statusEmoji: '💻',
        statusPreset: 'custom',
      },
    });
    console.log('   ✅ Profile updated:', profileRes.user.bio, '| Status:', profileRes.user.statusEmoji, profileRes.user.customStatus);

    // 5. Stories: Create Text Story
    console.log('\n5️⃣ Testing Stories (Create Text Story)...');
    const storyRes = await request('/stories', {
      method: 'POST',
      token: token1,
      body: {
        mediaType: 'text',
        textContent: 'Hello from Phase 2 Stories! 🚀',
        textBackground: 'from-emerald-600 to-teal-800',
        privacy: 'everyone',
      },
    });
    const story = storyRes.story;
    console.log('   ✅ Story created with ID:', story._id);

    // 6. Stories: Feed
    console.log('\n6️⃣ Testing Stories Feed...');
    const feedRes = await request('/stories/feed', { token: token2 });
    console.log('   ✅ Stories feed fetched. Groups count:', feedRes.feed.length);

    // 7. Stories: View & React
    console.log('\n7️⃣ Testing Story Reaction & View...');
    await request(`/stories/${story._id}/view`, { method: 'POST', token: token2 });
    const reactRes = await request(`/stories/${story._id}/react`, {
      method: 'POST',
      token: token2,
      body: { emoji: '🔥' },
    });
    console.log('   ✅ Bob reacted to Alice story with:', reactRes.reactions[0].emoji);

    // 8. Connections: Send Connection Request
    console.log('\n8️⃣ Testing Connections (Send Request)...');
    const connReqRes = await request(`/connections/request/${user2._id}`, {
      method: 'POST',
      token: token1,
    });
    const connectionId = connReqRes.connection._id;
    console.log('   ✅ Connection request sent, ID:', connectionId);

    // 9. Connections: Accept Connection Request
    console.log('\n9️⃣ Testing Connections (Accept Request)...');
    const connAcceptRes = await request(`/connections/${connectionId}/accept`, {
      method: 'POST',
      token: token2,
    });
    console.log('   ✅ Connection accepted, status:', connAcceptRes.connection.status);

    // 10. List Connections
    const myConnsRes = await request('/connections', { token: token1 });
    console.log('   ✅ Alice active connections count:', myConnsRes.connections.length);

    // 11. Audio Call: Log Call
    console.log('\n🔟 Testing Audio Calls (Log Call History)...');
    const callRes = await request('/calls/log', {
      method: 'POST',
      token: token1,
      body: {
        recipientId: user2._id,
        status: 'completed',
        duration: 75,
      },
    });
    console.log('   ✅ Audio call logged, duration:', callRes.call.duration, 'seconds');

    const callHistoryRes = await request('/calls/history', { token: token1 });
    console.log('   ✅ Call history fetched. Total calls:', callHistoryRes.calls.length);

    // 12. Notification Center
    console.log('\n1️⃣1️⃣ Testing Notification Center...');
    const notifsRes = await request('/notifications', { token: token1 });
    console.log('   ✅ Alice notifications fetched. Total:', notifsRes.notifications.length);

    // 13. Disappearing Messages: Configure Setting
    console.log('\n1️⃣2️⃣ Testing Disappearing Messages & Chat Media...');
    const chatRes = await request('/chats', {
      method: 'POST',
      token: token1,
      body: { recipientId: user2._id },
    });
    const conversationId = chatRes.conversation._id;

    await request(`/chats/${conversationId}/disappearing`, {
      method: 'PUT',
      token: token1,
      body: { duration: '24h' },
    });
    console.log('   ✅ Disappearing message timer set to 24h for conversation:', conversationId);

    // 14. Send Voice Message
    console.log('\n1️⃣3️⃣ Testing Voice Message Sending...');
    const msgRes = await request('/messages', {
      method: 'POST',
      token: token1,
      body: {
        conversationId,
        type: 'audio',
        media: {
          url: '/uploads/sample-voice.webm',
          fileName: 'sample-voice.webm',
          fileType: 'audio/webm',
          fileSize: 45000,
        },
        audioDuration: 12,
        waveform: [20, 50, 80, 40, 90, 60, 30, 70],
      },
    });
    console.log('   ✅ Voice message sent with duration:', msgRes.message.audioDuration, 'waveform bars:', msgRes.message.waveform.length);

    // 15. Shared Media Query
    const mediaRes = await request(`/messages/conversation/${conversationId}/media`, {
      token: token1,
    });
    console.log('   ✅ Shared media retrieved. Voice count:', mediaRes.audio.length);

    // 16. QR Code Profile Lookup
    console.log('\n1️⃣4️⃣ Testing QR Code Public ID Lookup...');
    const qrLookupRes = await request(`/users/qr/${user1.publicId}`, {
      token: token2,
    });
    console.log('   ✅ QR lookup successful for:', qrLookupRes.user.name, '(@' + qrLookupRes.user.username + ')');

    console.log('\n🎉 ALL PHASE 2 TESTS PASSED SUCCESSFULLY! 🚀\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.data) console.error('Details:', error.data);
    process.exit(1);
  }
}

runPhase2Tests();
