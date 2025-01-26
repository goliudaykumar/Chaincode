'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// Load connection profile
const ccpPath = path.resolve(__dirname, 'connection.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// Set up wallet path
const walletPath = path.join(__dirname, 'wallet');
const wallet = Wallets.newFileSystemWallet(walletPath);

// Function to connect to the network
async function getContract() {
    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true },
    });
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('basic'); // Chaincode name
    return { contract, gateway };
}

// API Routes

// 1. Initialize Ledger
app.post('/api/initLedger', async (req, res) => {
    try {
        const { contract, gateway } = await getContract();
        const result = await contract.submitTransaction('InitLedger');
        await gateway.disconnect();
        res.send(`Ledger initialized: ${result.toString()}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 2. Create Asset
app.post('/api/createAsset', async (req, res) => {
    const { id, dealerId, msisdn, mpin, balance, status, transAmount, transType, remarks } = req.body;
    try {
        const { contract, gateway } = await getContract();
        const result = await contract.submitTransaction(
            'CreateAsset',
            id,
            dealerId,
            msisdn,
            mpin,
            balance.toString(),
            status,
            transAmount.toString(),
            transType,
            remarks
        );
        await gateway.disconnect();
        res.send(`Asset created: ${result.toString()}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 3. Read Asset
app.get('/api/readAsset/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { contract, gateway } = await getContract();
        const result = await contract.evaluateTransaction('ReadAsset', id);
        await gateway.disconnect();
        res.send(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 4. Update Asset
app.put('/api/updateAsset/:id', async (req, res) => {
    const { id } = req.params;
    const { balance, status, transAmount, transType, remarks } = req.body;
    try {
        const { contract, gateway } = await getContract();
        const result = await contract.submitTransaction(
            'UpdateAsset',
            id,
            balance.toString(),
            status,
            transAmount.toString(),
            transType,
            remarks
        );
        await gateway.disconnect();
        res.send(`Asset updated: ${result.toString()}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 5. Get Asset History
app.get('/api/assetHistory/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { contract, gateway } = await getContract();
        const result = await contract.evaluateTransaction('GetAssetHistory', id);
        await gateway.disconnect();
        res.send(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Start the API Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});
