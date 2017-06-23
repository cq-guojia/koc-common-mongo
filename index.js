const Mongoose = require("mongoose");

const KOCReturn = require("koc-common-return");

const KOCMongo = {
  // region PageParm:分页，参数
  PageParm: function () {
    this.GetPageInfo = true;
    // this.ColumnPK = "";
    // this.ColumnMAX = "";
    // this.ColumnList = "";
    // this.TableList = "";
    // this.Condition = "";
    // this.OrderName = "";
    // this.Order = "";
    this.Start = 1;
    this.Length = 0;
  },
  // endregion
  // region PageInfo:分页，页数据
  PageInfo: async (query) => {
    let RecordCount = 0;
    let retValue = await KOCReturn.Promise(() => {
      return query.count();
    });
    if (!retValue.hasError) {
      RecordCount = retValue.returnObject;
    }
    if (!RecordCount) {
      retValue.hasError = false;
      retValue.returnObject = {
        RecordCount: 0,
        MaxCode: ""
      };
      return retValue;
    }
    retValue = await KOCReturn.Promise(() => {
      query.limit(1);
      return query.exec();
    });
    if (retValue.hasError) {
      retValue.hasError = false;
      retValue.returnObject = {
        RecordCount: 0,
        MaxCode: ""
      };
      return retValue;
    }
    retValue.hasError = false;
    retValue.returnObject = {
      RecordCount: RecordCount,
      MaxCode: retValue.returnObject
    };
    return retValue;
  },
  // endregion
};

module.exports = KOCMongo;