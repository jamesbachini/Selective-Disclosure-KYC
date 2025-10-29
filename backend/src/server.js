import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for KYC requests
// Structure: { requestId: { userId, issuerPubKey, attributes, userData, status, timestamp } }
const kycRequests = new Map();

// Structure: { userId: credentialJSON }
const issuedCredentials = new Map();

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/issuers - Get list of registered issuers (from contract)
// Note: In production, this would query the smart contract
app.get('/api/issuers', async (req, res) => {
  try {
    // TODO: Query smart contract for registered issuers
    // For now, return empty array
    res.json({ issuers: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/request-kyc - User submits KYC request
app.post('/api/request-kyc', (req, res) => {
  try {
    const { userId, issuerPubKey, attributes, userData } = req.body;

    if (!userId || !issuerPubKey || !attributes || !userData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const requestId = uuidv4();
    kycRequests.set(requestId, {
      userId,
      issuerPubKey,
      attributes, // Array of attribute names like ['over_18', 'resident_uk']
      userData, // { name, email, country, dob, etc. }
      status: 'pending',
      timestamp: new Date().toISOString()
    });

    console.log(`[KYC Request] ${requestId} from user ${userId} to issuer ${issuerPubKey}`);

    res.json({
      success: true,
      requestId,
      message: 'KYC request submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/kyc-requests - Get all pending KYC requests (for issuer dashboard)
app.get('/api/kyc-requests', (req, res) => {
  try {
    const { issuerPubKey, status } = req.query;

    let requests = Array.from(kycRequests.entries()).map(([id, data]) => ({
      requestId: id,
      ...data
    }));

    // Filter by issuer if provided
    if (issuerPubKey) {
      requests = requests.filter(r => r.issuerPubKey === issuerPubKey);
    }

    // Filter by status if provided
    if (status) {
      requests = requests.filter(r => r.status === status);
    }

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/kyc-requests/:requestId - Get specific KYC request
app.get('/api/kyc-requests/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = kycRequests.get(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      requestId,
      ...request
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/approve-kyc - Issuer approves KYC request
app.post('/api/approve-kyc', (req, res) => {
  try {
    const { requestId, issuerPubKey, credential } = req.body;

    if (!requestId || !issuerPubKey || !credential) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request = kycRequests.get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.issuerPubKey !== issuerPubKey) {
      return res.status(403).json({ error: 'Unauthorized issuer' });
    }

    // Update request status
    request.status = 'approved';
    request.approvedAt = new Date().toISOString();
    kycRequests.set(requestId, request);

    // Store credential for user to retrieve
    issuedCredentials.set(request.userId, {
      credential,
      requestId,
      timestamp: new Date().toISOString()
    });

    console.log(`[KYC Approved] ${requestId} for user ${request.userId}`);

    res.json({
      success: true,
      message: 'KYC approved and credential issued'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reject-kyc - Issuer rejects KYC request
app.post('/api/reject-kyc', (req, res) => {
  try {
    const { requestId, issuerPubKey, reason } = req.body;

    if (!requestId || !issuerPubKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request = kycRequests.get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.issuerPubKey !== issuerPubKey) {
      return res.status(403).json({ error: 'Unauthorized issuer' });
    }

    // Update request status
    request.status = 'rejected';
    request.rejectedAt = new Date().toISOString();
    request.rejectionReason = reason;
    kycRequests.set(requestId, request);

    console.log(`[KYC Rejected] ${requestId} for user ${request.userId}`);

    res.json({
      success: true,
      message: 'KYC request rejected'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/credential/:userId - User retrieves their credential
app.get('/api/credential/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const credentialData = issuedCredentials.get(userId);

    if (!credentialData) {
      return res.status(404).json({ error: 'No credential found for this user' });
    }

    // Return credential and then delete it (one-time retrieval)
    res.json({
      success: true,
      credential: credentialData.credential,
      timestamp: credentialData.timestamp
    });

    // Clean up after successful retrieval
    issuedCredentials.delete(userId);
    console.log(`[Credential Retrieved] User ${userId}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cleanup - Clean up old requests and credentials
app.post('/api/cleanup', (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    let cleanedRequests = 0;
    let cleanedCredentials = 0;

    // Clean old KYC requests
    for (const [id, data] of kycRequests.entries()) {
      if (new Date(data.timestamp) < cutoffTime) {
        kycRequests.delete(id);
        cleanedRequests++;
      }
    }

    // Clean old credentials
    for (const [userId, data] of issuedCredentials.entries()) {
      if (new Date(data.timestamp) < cutoffTime) {
        issuedCredentials.delete(userId);
        cleanedCredentials++;
      }
    }

    console.log(`[Cleanup] Removed ${cleanedRequests} requests and ${cleanedCredentials} credentials`);

    res.json({
      success: true,
      cleanedRequests,
      cleanedCredentials
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats - Get system statistics
app.get('/api/stats', (req, res) => {
  try {
    const pending = Array.from(kycRequests.values()).filter(r => r.status === 'pending').length;
    const approved = Array.from(kycRequests.values()).filter(r => r.status === 'approved').length;
    const rejected = Array.from(kycRequests.values()).filter(r => r.status === 'rejected').length;

    res.json({
      totalRequests: kycRequests.size,
      pendingRequests: pending,
      approvedRequests: approved,
      rejectedRequests: rejected,
      pendingCredentials: issuedCredentials.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Selective Disclosure KYC Backend`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});

export default app;
