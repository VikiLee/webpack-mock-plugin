const path = require('path');
const fs = require('fs');
const mockjs = require('mockjs');

class MockPlugin {
  constructor(options) {
    this.options = options;
    this.context = '';
    this.isCRA = !!options.config; // 如果是用react-react-app脚手架中使用，需要传cra webpack devServer的配置
    this.devConfig = options.config; // cra webpack devServer的配置
    if (this.isCRA) {
      this.apply()
    }
  }

  resolveMockData(mockDir, fileHandler) {
    const dirs = fs.readdirSync(mockDir);
    dirs.forEach((dir) => {
      var info = fs.statSync(mockDir + '/' + dir);
      if (info.isDirectory()){
        this.resolveMockData(mockDir + '/' + dir, fileHandler);
      } else{ 
        let filepath = mockDir + '/' + dir;
        // 文件相对路径
        let relpath = (mockDir + '/' + dir).substring(path.resolve(this.context, 'mock').length).split('.')[0];
        fileHandler && fileHandler(filepath, relpath);
      }
    })
  }

  before(app) {
    const options = this.options;
    this.resolveMockData(path.resolve(this.context, 'mock'), (filePath, relpath) => {
      const getData = function(res) {
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf-8');
          res.json(mockjs.mock(JSON.parse(data)));
        }
      }
      app.post(`${options.prefix}${relpath}`, function(req, res) {
        getData(res);
      })
      app.get(`${options.prefix}${relpath}`, function(req, res) {
        getData(res);
      });
      app.put(`${options.prefix}${relpath}`, function(req, res) {
        getData(res);
      });
      app.delete(`${options.prefix}${relpath}`, function(req, res) {
        getData(res);
      });
    });
  }

  apply(compiler) {
    if (this.isCRA) {
      this.devConfig.before = (app) => {
        this.before(app);
      }
    } else {
      const webpackOptions = compiler.options;
      this.context = webpackOptions.context;
      // 生产环境不需要mock
      if (webpackOptions.mode === 'production') {
        return;
      }
      webpackOptions.devServer = webpackOptions.devServer || {};
      webpackOptions.devServer.before = (app) => {
        this.before(app);
      }
    }
  }
}

module.exports = MockPlugin;