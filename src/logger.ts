// supported log levels
export enum LogLevel {
  Debug = 0,
  Warn = 1,
  Info = 2,
  Error = 3
}

export class Logger {

  /**
   * Creates new logger instance.
   * @param category Logger category, usually the source class name.
   * @param logLevel Log level to use or supress logging.
   */
  constructor(public category: string, public logLevel: LogLevel = LogLevel.Debug) {
  }

  /**
   * Logs new message.
   * @param logLevel Log message level.
   * @param message Log message.
   * @param params Log message params, if any.
   */
  public logMessage(logLevel: LogLevel, message: string, params: any = ''): void{
    if (logLevel >= this.logLevel) {
      if (params) {
        this.log(logLevel, message, params);
      } else {
        this.log(logLevel, message);
      }
    }
  }

  /**
   * Logs new debug message.
   * @param message Debug log message.
   * @param params Debug log message params, if any.
   */
  public debug(message: string, params: any = ''): void{
    if (this.logLevel <= LogLevel.Debug) {
      if (typeof params === 'object') {
        params = JSON.stringify(params, null, 2);
      }
      this.log(LogLevel.Debug, message, params);
    }
  }

  /**
   * Logs new error message.
   * @param message Error log message.
   * @param params Error log message params, if any.
   */
  public error(message: string, params: any = ''): void{
    if (typeof params === 'object') {
      params = JSON.stringify(params, null, 2);
    }
    this.log(LogLevel.Error, message, params);
  }

  /**
   * Logs new message to console based on the specified log level.
   * @param logLevel Log message level.
   * @param message Log message.
   * @param params Log message params, if any.
   */
  private log(logLevel: LogLevel, message: string, params: any = ''): void {
    switch (logLevel) {
      case LogLevel.Warn:
        console.warn(this.category + message, params);
        break;
      case LogLevel.Info:
        console.info(this.category + message, params);
        break;
      case LogLevel.Error:
        console.error(this.category + message, params);
        break;
      default: // debug
        console.log(this.category + message, params);
        break;
    }
  }

}
