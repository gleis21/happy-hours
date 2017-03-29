var TimeRecord = class TimeRecord {
  constructor(
    id,
    email,
    userName,
    duration,
    category,
    workingGroup,
    description,
    year,
    month,
    day
  ) {
    this.guid = id;
    this.email = email;
    this.userName = userName;
    this.duration = duration;
    this.category = category;
    this.workingGroup = workingGroup;
    this.description = description;
    this.year = year;
    this.month = month;
    this.day = day;
  }
};

module.exports.TimeRecord = TimeRecord;
