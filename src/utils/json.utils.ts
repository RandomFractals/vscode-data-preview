  /**
   * Flattens objects with nested properties for data view display.
   * @param obj Object to flatten.
   * @returns Flat Object.
   */
  export function flattenObject (obj: any): any {
    const flatObject: any = {};
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(flatObject, this.flattenObject(obj[key]));
      } else {
        flatObject[key] = obj[key];
      }
    });
    return flatObject;
  }
