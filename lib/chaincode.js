'use strict';

const { Contract } = require('fabric-contract-api');

class AssetContract extends Contract {
    async InitLedger(ctx) {
        const assets = [
            {
                DEALERID: '0001',
                MSISDN: '9876543210',
                MPIN: '1212',
                BALANCE: 10000,
                STATUS: 'active',
                TRANSAMOUNT: 0,
                TRANSTYPE: 'NA',
                REMARKS: 'Initial Balance',
            },
        ];

        for (let i = 0; i < assets.length; i++) {
            await ctx.stub.putState(
                `ASSET${i}`,
                Buffer.from(JSON.stringify(assets[i]))
            );
        }
        return 'Ledger Initialized Successfully';
    }

    // create assets

    async CreateAsset(ctx, id, dealerId, msisdn, mpin, balance, status, transAmount, transType, remarks) {
        const exists = await this.AssetExits(ctx, id);

        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            DEALERID: dealerId,
            MSISDN: msisdn,
            MPIN: mpin,
            BALANCE: balance,
            STATUS: status,
            TRANSAMOUNT: transAmount,
            TRANSTYPE: transType,
            REMARKS: remarks,
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return `Asset ${id} created successfully`;
    }

    // read assets

    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        } else {
            return assetJSON.toString();
        }
    }


    // update assets

    async UpdateAsset(ctx, id, balance, status, transAmount, transType, remarks) {
        const exists = await this.AssetExits(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const asset = JSON.parse(await this.ReadAsset(ctx, id));
        asset.BALANCE = balance;
        asset.STATUS = status;
        asset.TRANSAMOUNT = transAmount;
        asset.TRANSTYPE = transType;
        asset.REMARKS = remarks;

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return `Asset ${id} updated successfully`;
    }

    async AssetExits(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // get aseets history
    
    async GetAssetHistory(ctx, id) {
        const historyReport = await ctx.stub.getHistoryForKey(id);
        const history = [];
        let result = await historyReport.next();
        while (!result.done) {
            const record = result.value;

            history.push({
                txId: record.txId,
                timestamp: record.timestamp,
                data: record.isDelete ? 'Deleted' : JSON.parse(record.value.toString()),
            });
            result = await historyReport.next();
        }
        return history;
    }
}

module.exports = AssetContract;
