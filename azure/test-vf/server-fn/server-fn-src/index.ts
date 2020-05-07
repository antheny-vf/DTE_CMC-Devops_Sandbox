const { Sequelize, QueryTypes } = require('sequelize')
const axios = require('axios')

// FETCHER FUNCTION

module.exports = (context, req) => {

    const apiPath = 'https://vf-dte-cmc-function-responder.azurewebsites.net/api/vf-dte-cmc-function-responder'
    const config = {
        userName: "cacheuser",
        password: "6,S@S)]f$eFH\\/mt", // SWITCH THESE
        db: "vf-dte-cmc-cache-test", // SWITCH THESE
        host: "vf-dte-cmc-cache-test.database.windows.net" // SWITCH THESE
    }

    const sequelize = new Sequelize(config.db, config.userName, config.password, {
        host: config.host,
        dialect: 'mssql',
        dialectOptions: {
            options: {
                encrypt: true,
                trustServerCertificate: true 
            }
        }
    })

    const finish = (data: undefined|Array<any>|Object) => {
        if(data instanceof Object && 
          ( (Array.isArray(data) && data.length) || ( Object.keys(data).length ) ) 
        ) {
            context.res = { body: JSON.stringify(data) }  
        } else {
            context.res = {
                status: 404,
                body: "there was a an issue or we didn't find anything"
            }
        }
        context.done()
    }

    const initFetcher = async () => {
        try {
            await sequelize.authenticate();
            let done;
            
            if( ('ServiceOrderNum' in req.query) && 
                !!Number(req.query.ServiceOrderNum) &&
                req.query.ServiceOrderNum.length < 24 ) {

                done = await getWONsFromSO(req.query.ServiceOrderNum)
            } else if( ('WorkOrderNum' in req.query) && 
            !!Number(req.query.WorkOrderNum) &&
            req.query.WorkOrderNum.length < 24 ) {
                
                done = await getWOStatusFromWO(req.query.WorkOrderNum)
            } else {
                context.res = {
                    status: 412,
                    body: "failed at parameter check, double check you query and value"
                }
                context.done();
            }


            finish(done)
          } catch (error) {
            console.error(error);
          }
    }

    const getWONsFromSO = async (singleNum: string) => {
        let wons = await sequelize.query(
            `SELECT WorkOrderNum FROM dbo.WorkOrders WHERE ServiceOrderNum = $singleNum`,
            {
                bind: {singleNum},
                type: QueryTypes.SELECT
            }
        )
        return wons.map((wo) => wo.WorkOrderNum)
    }

    const getWOStatusFromWO = async (singleNum: string) => {
        let wonStatus = await sequelize.query(
            `SELECT WorkOrderStatus FROM dbo.WorkOrderStatus WHERE WorkOrderNum = $singleNum`,
            {
                bind: {singleNum},
                type: QueryTypes.SELECT
            }
        )
        return JSON.parse(wonStatus[0].WorkOrderStatus);
    }

    initFetcher()

};