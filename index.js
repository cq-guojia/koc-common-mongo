const Mongoose = require('mongoose')

const KOCReturn = require('koc-common-return')

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
   * @param model
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
   * @param model
   * @param data {Object} 要写入的数据
   * @return ReturnValue
   */
  Insert: (model, data) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    return KOCReturn.Promise(() => (new model(data)).save())
  },
  /**
   * @description 读取一条数据
   * @param model
   * @param conditions {Object} 查询条件
   * @param options {Object=} 参数
   * @param options.limit {Object=} 限制条数
   * @param options.sort {Object=} 排序
   * @param options.skip {Object=} 跳过条数
   * @param options.lean {Object=} 返回数据类型结果
   * @param options.projection {Object=} 返回字段
   * @return ReturnValue
   */
  FindOne: (model, conditions, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (!conditions) return KOCReturn.Value({ hasError: true, message: 'query error.' })
    if (options.lean !== false) options.lean = true
    return KOCReturn.Promise(() => model.findOne(conditions, null, options))
  },
  /**
   * @description 读取多条数据
   * @param model {Object}
   * @param conditions {Object} 查询条件
   * @param options {Object=} 参数
   * @param options.limit {Object=} 限制条数
   * @param options.sort {Object=} 排序
   * @param options.skip {Object=} 跳过条数
   * @param options.lean {Object=} 返回数据类型结果
   * @param options.projection {Object=} 返回字段
   * @return ReturnValue
   */
  Find: (model, conditions, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (options.lean !== false) options.lean = true
    if (!options.limit) options.limit = 5000
    return KOCReturn.Promise(() => model.find(conditions, null, options))
  },
  /**
   * @description 查找并更新
   * @param model {Object}
   * @param conditions {Object} 查询条件
   * @param update {Object=} 更新内容
   * @param options {Object=} 参数
   * @param options.lean {Object=} 返回数据类型结果
   * @param options.new {boolean=} 是否返回更新后数据
   * @param options.upsert {boolean=} 当查不到时是否写入数据
   * @param options.fields {Object} 要返回的字段
   * @param options.sort {Object} 排序，当匹配的结果为多条时，根据排序更新第一条记录
   * @param options.setDefaultsOnInsert {boolean} 是否根据schema配置写入默认值
   * @return ReturnValue
   */
  FindOneAndUpdate: (model, conditions, update, options = {}) => {
    if (!model) return KOCReturn.Value({ hasError: true, message: 'model error.' })
    if (!conditions) return KOCReturn.Value({ hasError: true, message: 'conditions error.' })
    if (options.lean !== false) options.lean = true
    return KOCReturn.Promise(() => model.findOneAndUpdate(conditions, update, options))
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
