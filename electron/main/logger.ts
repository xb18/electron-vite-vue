import log from 'electron-log/main';
import path from 'node:path';
import { app } from 'electron';

log.initialize();

// 获取应用安装目录
const appPath = process.env.NODE_ENV === 'development'
  ? app.getAppPath()
  : path.dirname(app.getPath('exe'));

// 设置日志目录为应用安装目录下的 logs 文件夹
const logsPath = path.join(appPath, 'logs');

// 配置日志
log.transports.file.level = "info";
log.transports.console.level = "debug";

// 生产环境配置
if (process.env.NODE_ENV === 'production') {
  log.transports.console.level = 'warn';
}

// 设置日志文件路径
log.transports.file.resolvePathFn = (variables, message) => {
  let fileName = 'main.log';
  if(message?.variables.processType === 'renderer') {
    fileName = 'renderer.log';
  }
  return path.join(logsPath, fileName);
};
// 获取日志文件路径的方法
export const getLogFile = () => {
  return {
    path: path.join(logsPath, 'app.log')
  };
};

export const logger = log;