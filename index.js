const Mongoose = require('mongoose')

const KOCReturn = require('koc-common-return')

let clientList = {}

const KOCMongo = {
  // region Init:初始化
  Init: (dblist) => {
    if (!dblist) {
      return
    }
    if (!(dblist instanceof Array)) {
      dblist = [dblist]
    }
    dblist.forEach((ThisValue) => {
      try {
        const Options = {
          useNewUrlParser: true, // 新连接字符串必须指定端口
          useCreateIndex: true, // 使用新版本创建索引命令
          autoIndex: false, // 是否连接时自动创建索引
          autoReconnect: true, // 是否重连
          family: 4 // 使用IPV4
        }
        let Auth = ''
        if (ThisValue.user && ThisValue.password) {
          Auth = ThisValue.user + ':' + ThisValue.password + '@'
        }
        let ConnectString = 'mongodb://' + Auth + ThisValue.uri + ':' + ThisValue.port + '/' + ThisValue.database
        clientList[ThisValue.name] = Mongoose.createConnection(ConnectString, Options)
      } catch (ex) {
      }
    })
    return clientList
  },
  // endregion
  // region Model:取得Model
  Model: (db, name, obj, indexes) => {
    const schema = new Mongoose.Schema(obj)
    if (indexes && Array.isArray(indexes)) {
      for (const ThisValue of indexes) {
        schema.index(ThisValue.Index, ThisValue.Option)
      }
    }
    return db.model(name, schema, name)
  },
  // endregion
  // region
  CreateIndexes: (model, option) => {
    if (!model) return KOCReturn.Value({hasError: true, message: 'model error.'})
    option = option || {}
    return KOCReturn.Promise(() => {
      return model.createIndexes(option)
    })
  },
  // endregion
  // region PageParm:分页，参数
  PageParm: function () {
    this.GetPageInfo = true
    this.OrderName = ''
    this.Start = 1
    this.Length = 0
  },
  // endregion
  // region PageInfo:分页，页数据
  PageInfo: async (model, criteria) => {
    let RecordCount = 0
    let retValue = await KOCReturn.Promise(() => {
      return model.estimatedDocumentCount(criteria)
    })
    if (!retValue.hasError) {
      RecordCount = retValue.returnObject
    }
    if (!RecordCount) {
      return {
        RecordCount: 0,
        MaxCode: '',
      }
    }
    retValue = await KOCReturn.Promise(() => {
      return model.findOne(criteria)
    })
    if (retValue.hasError) {
      return {
        RecordCount: 0,
        MaxCode: '',
      }
    }
    return {
      RecordCount: RecordCount,
      MaxCode: retValue.returnObject._id,
    }
    return retValue
  },
  // endregion
  // region PageList:分页数据
  PageList: async (model, criteria, pageparm) => {
    return await KOCReturn.Promise(() => {
      let Sort = null
      if (pageparm.OrderName) {
        Sort = {}
        pageparm.OrderName = pageparm.OrderName.split(',')
        for (let ThisValue of pageparm.OrderName) {
          ThisValue = ThisValue.split(' ')
          ThisValue.length === 2 &&
          (Sort[ThisValue[0]] = ThisValue[1].toLowerCase())
        }
      }
      let Query = model.find(criteria)
      Sort && (Query.sort(Sort))
      pageparm.Start && (Query.skip(pageparm.Start))
      return Query.limit(pageparm.Length)
    })
  },
  // endregion
  // region Page:分页
  Page: async (model, criteria, max, pageparm) => {
    !criteria && (criteria = {})
    max && (criteria._id = {$gte: max})
    let retValue = await KOCMongo.PageList(model, criteria, pageparm)
    if (!pageparm.GetPageInfo || retValue.hasError) {
      return retValue
    }
    retValue.PutValue('PageInfo', await KOCMongo.PageInfo(model, criteria))
    return retValue
  },
  // endregion
}

module.exports = KOCMongo
