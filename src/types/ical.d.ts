// Type declarations for ical.js library
declare module 'ical.js' {
  export interface ComponentJSON {
    [key: string]: any;
  }

  export class Component {
    constructor(jCal: ComponentJSON | string);
    static fromString(str: string): Component;
    
    name: string;
    jCal: ComponentJSON;
    
    getFirstSubcomponent(name?: string): Component | null;
    getAllSubcomponents(name?: string): Component[];
    getFirstPropertyValue(name: string): any;
    getAllProperties(name?: string): Property[];
    addPropertyWithValue(name: string, value: any): Property;
    updatePropertyWithValue(name: string, value: any): Property;
    removeAllProperties(name?: string): boolean;
    toString(): string;
  }

  export class Event {
    constructor(component?: Component, options?: any);
    static fromString(str: string): Event;
    
    uid: string;
    summary: string;
    description: string;
    location: string;
    startDate: Time;
    endDate: Time;
    component: Component;
    
    toString(): string;
  }

  export class Time {
    constructor(data?: any);
    static fromString(str: string): Time;
    static fromJSDate(date: Date, useUTC?: boolean): Time;
    
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    isDate: boolean;
    zone: Timezone;
    
    toJSDate(): Date;
    toString(): string;
    compare(other: Time): number;
  }

  export class Property {
    constructor(jCal: any[] | string, parent?: Component);
    
    name: string;
    value: any;
    
    getFirstValue(): any;
    getValues(): any[];
    setParameter(name: string, value: string): void;
    getParameter(name: string): string;
    toString(): string;
  }

  export class Timezone {
    static localTimezone: Timezone;
    static utcTimezone: Timezone;
    
    constructor(data?: any);
    
    tzid: string;
  }

  export function parse(input: string): ComponentJSON;
  export function stringify(jCal: ComponentJSON): string;
}