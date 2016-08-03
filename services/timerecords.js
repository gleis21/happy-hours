const _ = require("lodash");

function getGroupedByMonth(timerecords) {
    const recordsGroupedByMonth = _.groupBy(timerecords, record => { 
        const y = record.year;
        const m = record.month - 1;
          
        return new Date(y, m, 1);
     });
    
    const res = _.map(recordsGroupedByMonth, (rowsByMonth, key) => {
         return {
             monthDate : key, 
             records : _.orderBy(rowsByMonth, r => {
                                        const y = r.year;
                                        const m = r.month - 1;
                                        const d = r.day;
                                        
                                        return new Date(y, m, d)
                                        }, "desc"),
             durationSum : _.reduce(rowsByMonth, (sum, r) => { return sum + parseFloat(r.duration) }, 0)
            }
    });
    
    return _.orderBy(res, x => { return new Date(x.monthDate) }, "desc");
} 

module.exports = {
  getGroupedByMonth: getGroupedByMonth,
}