module.exports = function (repo, map) {

  function getWorkingGroups() {
    return getStaticData("working_groups", repo.getWorkingGroups());
  }

  function getDurations() {
    return getStaticData("durations", repo.getDurations());
  }

  function getCategories() {
    return getStaticData("categories", repo.getCategories());
  }

  function getAuthorizedUsers() {
    return getStaticData("authorized_users", repo.getAuthorizedUsers());
  }

  function getStaticData(key, promise) {
    return new Promise((resolve, reject) => {
      const k = repo.spreadsheetId + key;
      if (map.has(k)) {
        const res = JSON.parse(data);
        resolve(res);
      } else {
        promise.then(res => {
          map[k] = JSON.stringify(res)
          resolve(res);
        });
      }
    });
  }

  return {
    getWorkingGroups: getWorkingGroups,
    getDurations: getDurations,
    getCategories: getCategories,
    getAuthorizedUsers: getAuthorizedUsers
  };
};
