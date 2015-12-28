import { Transform } from 'stream';
export declare class UserStream extends Transform {
    constructor();
    _transform(users: Array<{
        id_str: string;
        screen_name?: string;
    } | {
        id_str?: string;
        screen_name: string;
    }>, encoding: string, callback: (error?: Error, outputChunk?: any) => void): void;
}
export declare function main(): void;
