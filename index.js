const Mongoose = require('mongoose')

const KOCReturn = require('koc-common-return')
const KOCString = require('koc-common-string')

const clientList = {}

const KOCMongo = module.exports = {
  // region Init:初始化
  Init: (dblist) => {
    if (!dblist) return
    if (!(dblist instanceof Array)) dblist = [dblist]
    dblist.forEach((thisValue) => {
      try {
        const options = {
          autoIndex: false,         // 禁止自动创建索引
          useCreateIndex: true,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useFindAndModify: false,  // 使用mongo原生的findOneAndUpdate
        }
        let url = 'mongodb://'
        if (thisValue.user && thisValue.password) {
          url += `${thisValue.user}:${thisValue.password}@`
          options.authSource = thisValue.authSource || 'admin'
        }
        if (thisValue.replicaSet && Array.isArray(thisValue.uri) && thisValue.uri.length > 0) {
          url += thisValue.uri.map(t => t + ':' + thisValue.port).join(',')
          options.replicaSet = thisValue.replicaSet
        } else {
          url += `${thisValue.uri}:${thisValue.port}`
        }
        url = url + `/${thisValue.database}`
        clientList[thisValue.name] = Mongoose.createConnection(url, options)
      } catch (ex) {
        console.error('connect to mongo error', ex)
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
  /**
   * @description 创建索引
   * @param {Object} model
   * @param {Object=} options 参数
   * @param {boolean} options.background 后台创建索引
   * @return ReturnValue
   */
  CreateIndexes: (model, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (options.background !== false) options.background = true
    return KOCReturn.Promise(() => model.createIndexes(options))
  },
  /**
   * @description 写入一条数据
   * @param {function} model
   * @param {Object} data 要写入的数据
   * @return {Object} ReturnValue
   */
  Insert: (model, data) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    return KOCReturn.Promise(() => (new model(data)).save())
  },
  /**
   * @description 读取一条数据
   * @param {Object} model
   * @param {Object} conditions 查询条件
   * @param {Object=} options 参数
   * @param {Object=} options.limit 限制条数
   * @param {Object=} options.sort 排序
   * @param {Object=} options.skip 跳过条数
   * @param {Object=} options.lean 返回数据类型结果
   * @param {Object=} options.projection 返回字段
   * @return {Object} ReturnValue
   */
  FindOne: (model, conditions, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (!conditions) return KOCReturn.Value({ hasError: true, message: 'query error.' })
    if (options.lean !== false) options.lean = true
    return KOCReturn.Promise(() => model.findOne(conditions, null, options))
  },
  /**
   * @description 读取多条数据
   * @param {Object} model
   * @param {Object=} conditions 查询条件
   * @param {Object=} options 参数
   * @param {Object=} options.limit 限制条数(默认5000)
   * @param {Object=} options.sort 排序
   * @param {Object=} options.skip 跳过条数
   * @param {Object=} options.lean 返回数据类型结果
   * @param {Object=} options.projection 返回字段
   * @return {Object} ReturnValue
   */
  Find: (model, conditions, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (options.lean !== false) options.lean = true
    if (!options.limit) options.limit = 5000
    return KOCReturn.Promise(() => model.find(conditions, null, options))
  },
  /**
   * @description 查找并更新
   * @param {Object} model
   * @param {Object} conditions 查询条件
   * @param {Object=} update 更新内容
   * @param {Object=} options 参数
   * @param {Object=} options.lean 返回数据类型结果
   * @param {boolean=} options.new 是否返回更新后数据
   * @param {boolean=} options.upsert 当查不到时是否写入数据
   * @param {Object} options.fields 要返回的字段
   * @param {Object} options.sort 排序，当匹配的结果为多条时，根据排序更新第一条记录
   * @param {boolean} options.setDefaultsOnInsert 是否根据schema配置写入默认值
   * @return {Object} ReturnValue
   */
  FindOneAndUpdate: (model, conditions, update = {}, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (!conditions) return KOCReturn.Value({ hasError: true, message: 'conditions error.' })
    if (options.lean !== false) options.lean = true
    return KOCReturn.Promise(() => model.findOneAndUpdate(conditions, update, options))
  },
  /**
   * @description 聚合计算
   * @param {Object} model
   * @param {Object[]} pipeline
   * @return {Object} ReturnValue
   */
  Aggregate: (model, pipeline) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (KOCString.ToArray(pipeline).length === 0) return KOCReturn.Value({ hasError: true, message: 'pipeline error.' })
    return KOCReturn.Promise(() => model.aggregate(pipeline))
  },
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
      return model.countDocuments(criteria)
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
      let Query = model.find(criteria, null, { lean: true })
      Sort && (Query.sort(Sort))
      pageparm.Start && (Query.skip(pageparm.Start))
      return Query.limit(pageparm.Length)
    })
  },
  // endregion
  // region Page:分页
  Page: async (model, criteria, max, pageparm) => {
    !criteria && (criteria = {})
    max && (criteria._id = { $gte: max })
    let retValue = await KOCMongo.PageList(model, criteria, pageparm)
    if (!pageparm.GetPageInfo || retValue.hasError) {
      return retValue
    }
    retValue.PutValue('PageInfo', await KOCMongo.PageInfo(model, criteria))
    return retValue
  },
  // endregion
}
