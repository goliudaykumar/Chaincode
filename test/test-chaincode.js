/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub, ClientIdentity } = require('fabric-shim');

const AssetTransfer = require('../lib/chaincode.js');

let assert = sinon.assert;
chai.use(sinonChai);

describe('Asset Transfer Events Tests', () => {
	let transactionContext, chaincodeStub, clientIdentity, asset;
	let transientMap, asset_properties;

	beforeEach(() => {
		transactionContext = new Context();

		chaincodeStub = sinon.createStubInstance(ChaincodeStub);
		chaincodeStub.getMspID.returns('org1');
		transactionContext.setChaincodeStub(chaincodeStub);

		clientIdentity = sinon.createStubInstance(ClientIdentity);
		clientIdentity.getMSPID.returns('org1');
		transactionContext.clientIdentity = clientIdentity;

		chaincodeStub.putState.callsFake((key, value) => {
			if (!chaincodeStub.states) {
				chaincodeStub.states = {};
			}
			chaincodeStub.states[key] = value;
		});

		chaincodeStub.getState.callsFake(async (key) => {
			let ret;
			if (chaincodeStub.states) {
				ret = chaincodeStub.states[key];
			}
			return Promise.resolve(ret);
		});

		chaincodeStub.deleteState.callsFake(async (key) => {
			if (chaincodeStub.states) {
				delete chaincodeStub.states[key];
			}
			return Promise.resolve(key);
		});

		chaincodeStub.getStateByRange.callsFake(async () => {
			function* internalGetStateByRange() {
				if (chaincodeStub.states) {
					// Shallow copy
					const copied = Object.assign({}, chaincodeStub.states);

					for (let key in copied) {
						yield {value: copied[key]};
					}
				}
			}

			return Promise.resolve(internalGetStateByRange());
		});

		asset = {
            DEALERID: '0001',
            MSISDN: '9876543210',
            MPIN: '1212',
            BALANCE: 10000,
            STATUS: 'active',
            TRANSAMOUNT: 0,
            TRANSTYPE: 'NA',
            REMARKS: 'Initial Balance',
		};
	});

	describe('Test CreateAsset', () => {
		it('should return error on CreateAsset', async () => {
			chaincodeStub.putState.rejects('failed inserting key');

			let assetTransfer = new AssetTransfer();
			try {
				await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);
				assert.fail('CreateAsset should have failed');
			} catch(err) {
				expect(err.name).to.equal('failed inserting key');
			}
		});

		it('should return success on CreateAsset', async () => {
			let assetTransfer = new AssetTransfer();

			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			let ret = JSON.parse((await chaincodeStub.getState(asset.DEALERID)).toString());
			expect(ret).to.eql(asset);
		});
		it('should return success on CreateAsset with transient data', async () => {
			let assetTransfer = new AssetTransfer();
			chaincodeStub.getTransient.returns(transientMap);
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			let ret = JSON.parse((await chaincodeStub.getState(asset.DEALERID)).toString());
			expect(ret).to.eql(asset);
		});
	});

	describe('Test ReadAsset', () => {
		it('should return error on ReadAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			try {
				await assetTransfer.ReadAsset(transactionContext, 'asset2');
				assert.fail('ReadAsset should have failed');
			} catch (err) {
				expect(err.message).to.equal('The asset asset2 does not exist');
			}
		});

		it('should return success on ReadAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);
			const assetString = await assetTransfer.ReadAsset(transactionContext, 'asset1');
			const readAsset = JSON.parse(assetString);
			expect(readAsset).to.eql(asset);
		});

		it('should return success on ReadAsset with private data', async () => {
			asset.asset_properties = asset_properties;
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);
			chaincodeStub.getPrivateData.returns(Buffer.from(JSON.stringify(asset_properties)));
			const assetString = await assetTransfer.ReadAsset(transactionContext, 'asset1');
			const readAsset = JSON.parse(assetString);
			expect(readAsset).to.eql(asset);
		});
	});

	describe('Test UpdateAsset', () => {
		it('should return error on UpdateAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			try {
				await assetTransfer.UpdateAsset(transactionContext, 'asset2', '0002', '9876543211', '1211', 15000, 'active', 0, 'NA', 'Initial Balance');
				assert.fail('UpdateAsset should have failed');
			} catch (err) {
				expect(err.message).to.equal('The asset asset2 does not exist');
			}
		});

		it('should return success on UpdateAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			await assetTransfer.UpdateAsset(transactionContext, 'asset1', '0001', '9876543210', '1212', 10000, 'active', 0, 'NA', 'Initial Balance');
			let ret = JSON.parse(await chaincodeStub.getState(asset.ID));
			let expected = {
                DEALERID: '0001',
                MSISDN: '9876543210',
                MPIN: '1212',
                BALANCE: 10000,
                STATUS: 'active',
                TRANSAMOUNT: 0,
                TRANSTYPE: 'NA',
                REMARKS: 'Initial Balance',
			};
			expect(ret).to.eql(expected);
		});
	});

	describe('Test DeleteAsset', () => {
		it('should return error on DeleteAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			try {
				await assetTransfer.DeleteAsset(transactionContext, 'asset2');
				assert.fail('DeleteAsset should have failed');
			} catch (err) {
				expect(err.message).to.equal('The asset asset2 does not exist');
			}
		});

		it('should return success on DeleteAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			await assetTransfer.DeleteAsset(transactionContext, asset.DEALERID);
			let ret = await chaincodeStub.getState(asset.DEALERID);
			expect(ret).to.equal(undefined);
		});
	});

	describe('Test TransferAsset', () => {
		it('should return error on TransferAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			try {
				await assetTransfer.TransferAsset(transactionContext, 'asset2', '1211');
				assert.fail('DeleteAsset should have failed');
			} catch (err) {
				expect(err.message).to.equal('The asset asset2 does not exist');
			}
		});

		it('should return success on TransferAsset', async () => {
			let assetTransfer = new AssetTransfer();
			await assetTransfer.CreateAsset(transactionContext, asset.DEALERID, asset.MSISDN, asset.MPIN, asset.BALANCE, asset.STATUS, asset.TRANSAMOUNT, asset.TRANSTYPE, asset.REMARKS);

			await assetTransfer.TransferAsset(transactionContext, asset.DEALERID, '1211');
			let ret = JSON.parse((await chaincodeStub.getState(asset.DEALERID)).toString());
			expect(ret).to.eql(Object.assign({}, asset, {MPIN: '1211'}));
		});
	});
});
