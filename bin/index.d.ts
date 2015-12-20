import { Transform } from 'stream';
import { User } from '../index';
export declare class UserStream extends Transform {
    constructor();
    _transform(users: User[], encoding: string, callback: (error?: Error, outputChunk?: any) => void): void;
}
export declare function main(): void;
