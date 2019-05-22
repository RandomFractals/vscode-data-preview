import * as fs from 'fs';
import * as path from 'path';
import * as config from './config';
import {Logger, LogLevel} from './logger';

/**
 * Template manager api interface.
 */
export interface ITemplateManager {
  getTemplate(name: string): Template;
}

/**
 * Template type for loading file templates
 * and template file content.
 */
export class Template {
  // template name
  public name: string = '';

  // template file content
  public content: string = '';
}

/**
 * Template manager implementation for html and json files.
 */
export class TemplateManager implements ITemplateManager {
  
  private templates: Array<Template>; // loaded templates
  private logger: Logger = new Logger('template.manager:', config.logLevel);

  /**
   * Creates new template manager and loads templates 
   * from the specified template folder.
   * @param templateFolder Template folder to inspect.
   */
  public constructor(private templateFolder: string) {
    this.templates = this.loadTemplates();
  }

  /**
   * Loads .html and .json templates from the specified template folder.
   * @param templateFolder Template folder to inspect.
   */
  private loadTemplates(): Array<Template> {
    this.logger.logMessage(LogLevel.Debug, 
      'loadTemplates(): loading file templates... templateFolder:', this.templateFolder);
    const fileNames: string[] = fs.readdirSync(this.templateFolder)
      .filter(fileName => fileName.endsWith('.html') || fileName.endsWith('.json'));
    const templates: Array<Template> = [];
    // TODO: change this to read file async ???
    fileNames.forEach(fileName => templates.push(
      {name: fileName, content: fs.readFileSync(path.join(this.templateFolder, fileName), 'utf8')}
    ));
    this.logger.logMessage(LogLevel.Debug, 'loadTemplates(): templates:', fileNames);
    return templates;
  }

  /**
   * Gets file template with the specified name.
   * @param name Template name to find.
   */
  public getTemplate(name: string): Template {
    return this.templates.find(template => template.name === name);
  }
}
