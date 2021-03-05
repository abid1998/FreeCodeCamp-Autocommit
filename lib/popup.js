let upload = document.getElementById('upload');
let generate = document.getElementById('generate');
let repoList = document.getElementById('repos');
let tokenSection = document.getElementById('token_section');
let token = document.getElementById('token');
let tokenButton = document.getElementById('save');
let create = document.getElementById('create');
let info = document.getElementById('info');
let link = document.getElementById('link');
let loading = document.getElementById('loading');
hideLoading();
var currentRepo = '';

upload.onclick = function() {
  showLoading('Uploading...');
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {

    }, function(response) {
      if (response) {
        updateSolution(response);
      } else {
        console.log('error to get response');
      }
    })
  });
}

generate.onclick = function() {
  chrome.tabs.create({
    active: true,
    url: 'https://github.com/settings/tokens/new?scopes=repo&description=FCCCommit'
  });
}

tokenButton.onclick = function() {
  chrome.storage.sync.set({
    'token': token.value
  });
  tokenSection.style.display = "none";
  getRepos();
}

create.onclick = function() {
  createRepo();
}

github_link.onclick = function() {
  chrome.tabs.create({
    active: true,
    url: 'https://github.com/' + currentRepo
  });
}
option_link.onclick = function() {
  if (tokenSection.style.display == "none") {
    tokenSection.style.display = "block";
  } else {
    tokenSection.style.display = "none";
  }
}

chrome.storage.sync.get(['token'], function(items) {
  if (items['token'] && items['token'].length > 0) {
    token.value = items['token'];
    getRepos();
    tokenSection.style.display = "none";
  } else {
    tokenSection.style.display = "block";
  }
});

repoList.onchange = function() {
  currentRepo = repoList.value;
  chrome.storage.sync.set({
    'repo': currentRepo
  });
}

function updateSolution(solution) {
  var path = '/repos/' + currentRepo + '/contents/FreeCodeCampSolutions/' + solution.fileName + '/'  + solution.fileName + '.js';
  console.log(path);
  updateContent(path, {
      message: solution.url,
      content: encode(solution.code)
    }, function () {
      setTimeout(function () {
        console.log("Contents Updated !!!")
      }, 3000);
    });
    
    var ReadMepath = '/repos/' + currentRepo + '/contents/FreeCodeCampSolutions/' + solution.fileName + '/' + 'README.md';
    updateReadme(ReadMepath, {
      message: solution.url,
      content: encode(solution.description)
    }, function () {
      setTimeout(function () {
        console.log("Readme Updated !!!")
      }, 3000);
    });
  }

function getRepos() {
  showLoading('Get Repo...');
  chrome.storage.sync.get(['repo'], function(items) {
    while (repoList.options.length > 1) {
      repoList.removeChild(repoList.lastChild);
    }
    currentRepo = items['repo'];
    var opt = document.createElement('option');
    opt.appendChild(document.createTextNode(currentRepo));
    opt.value = currentRepo;
    repoList.appendChild(opt);
    repoList.value = currentRepo;
  });
  getRequest('/user/repos?affiliation=owner')
    .then(result => {
      while (repoList.options.length > 1) {
        repoList.removeChild(repoList.lastChild);
      }
      repoList.selectedIndex = 0;
      for (var i = 0; i < result.length; i++) {
        var repo = result[i];
        var opt = document.createElement('option');
        opt.appendChild(document.createTextNode(repo.full_name));
        opt.value = repo.full_name;
        repoList.appendChild(opt);
        if (repo.name == 'leetcode') {
          create.disabled = true;
        }
      }
      chrome.storage.sync.get(['repo'], function(items) {
        if (validRepo(items['repo'])) {
          currentRepo = items['repo'];
          repoList.value = currentRepo;
        }
      });
      hideLoading();
    });
}

function validRepo(repo) {
  for (var i = 0; i < repoList.length; i++) {
    if (repo == repoList[i].text) {
      return true;
    }
  }
  return false;
}

function createRepo() {
  showLoading('Create repo...')
  var name = 'FCC-Solutions';
  post('/user/repos', 'POST', {
      name: name,
      private: true
    })
    .then(obj => {
      chrome.storage.sync.set({
        'repo': obj['full_name']
      }, function(result) {
        getRepos();
      });
    });
}

function updateContent(path, data, callback) {
  getRequest(path)
    .then(result => {
      if (result['sha']) {
        data.sha = result['sha'];
        if (data.content == result['content'].split('\n').join('')) {
          console.log('same data');
          callback();
          return;
        }
      }
      post(path, 'PUT', data)
        .then(callback());
    });
}

function updateReadme(path, description, callback) {
  const turndownService = new TurndownService();
  var data = turndownService.turndown(description);

  getRequest(path)
    .then(result => {
      if (result['sha']) {
        data.sha = result['sha'];
        if (data.content == result['content'].split('\n').join('')) {
          console.log('same data');
          callback();
          return;
        }
      }
      post(path, 'PUT', data)
        .then(callback());
    });
}
