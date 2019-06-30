import * as config from '../config';
import {Logger} from '../logger';

const logger: Logger = new Logger(`json.utils:`, config.logLevel);

/**
 * Converts json data to property array if data is an object.
 * @param data Json data array or object to convert.
 */
export function convertJsonData(data: any): any {
  if (!Array.isArray(data)) {
    // convert it to flat object properties array
    data = this.objectToPropertyArray(
      this.flattenObject(data, true)); // preserve parent path
  }
  return data;
}

/**
 * Flattens objects with nested properties for data view display.
 * @param obj Object to flatten.
 * @param preservePath Optional flag for generating key path.
 * @returns Flat Object.
 */
export function flattenObject (obj: any, preservePath: boolean = false): any {
  const flatObject: any = {};
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      let children: any = {};
      Object.assign(children, this.flattenObject(obj[key], preservePath));
      Object.keys(children).forEach(childKey => {
        const propertyName: string = (preservePath) ? `${key}.${childKey}`: childKey;
        flatObject[propertyName] = children[childKey];
      });
    } 
    else if (Array.isArray(obj[key])) {
    
    } else if (obj[key]) {
      flatObject[key] = obj[key].toString();
    }
  });
  return flatObject;
}

/**
 * Converts an object to an array of property key/value objects.
 * @param obj Object to convert.
 */
export function objectToPropertyArray(obj: any): Array<any> {
  const properties: Array<any> = [];
  if (obj && obj !== undefined) {
    Object.keys(obj).forEach((key) => {
      properties.push({
        key: key,
        value: obj[key]
      });
    });
  }
  return properties;
}
