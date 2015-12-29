import {createReadStream, createWriteStream} from 'fs';
import {parse as querystringParse} from 'querystring';
import {parse as urlParse, format as urlFormat} from 'url';
import {Transform} from 'stream';

import * as yargs from 'yargs';
import {logger, Level} from 'loge';

import {readToEnd} from 'streaming';
import {Batcher} from 'streaming/batcher';
import {Filter} from 'streaming/filter';
import {Parser as JSONParser, Stringifier as JSONStringifier} from 'streaming/json';
import {Splitter} from 'streaming/splitter';
import {Timeout} from 'streaming/timeout';
import {Mapper} from 'streaming/mapper';
import {Transformer} from 'streaming/transformer';

import {User, UserIdentifier, Status, request, readJSON, getStatuses, getUsers, StatusStream} from '../index';
import {TwitterAPIEndpoints} from '../codes';

function readExistingTweets(outputFilepath: string,
                            callback: (error: Error, fetchedStatuses?: {[index: string]: number}) => void) {
  let fetchedStatuses: {[index: string]: number} = {};

  // quick exit if output is undefined
  if (outputFilepath === undefined) return callback(null, fetchedStatuses);

  logger.info(`Reading existing tweets from "${outputFilepath}"`);

  let inputStream = createReadStream(outputFilepath, {flags: 'r', encoding: 'utf8'});
  inputStream.pipe(new JSONParser())
  .on('data', (status: Status) => {
    fetchedStatuses[status.id_str] = 1;
  })
  .on('error', (error: Error) => {
    callback(error);
  })
  .on('end', () => {
    logger.info(`Found ${Object.keys(fetchedStatuses).length} tweets in "${outputFilepath}"`);
    callback(null, fetchedStatuses);
  });
}

/**
STDIN should be a newline-separated list of status IDs

TODO: call the callback on error
*/
function statuses(argvparser: yargs.Argv, callback: (error?: Error) => void) {
  let argv = argvparser.options({
    output: {
      description: 'tweet destination file (defaults to STDOUT)',
      alias: 'o',
    },
  }).argv;

  /**
  @param {string[]} id_strs - A batch of status id strings
  @param {string} encoding - should be null
  */
  function transformFn(id_strs: string[],
                       encoding: string,
                       callback: (error?: Error, outputChunk?: any) => void) {
    getStatuses(id_strs, (error, statuses) => {
      if (error) return callback(error);
      // in this context, `this` will be a streaming.Transformer (which extends stream.Transform)
      statuses.forEach(status => this.push(status));
      return callback();
    });
  }

  let outputStream = argv.output ? createWriteStream(argv.output, {flags: 'a', encoding: 'utf8'}) : process.stdout;

  readExistingTweets(argv.output, (error, fetchedStatuses) => {
    if (error) return callback(error);

    // process.stdin.resume();
    // inputStream.setEncoding('utf8');
    process.stdin
    .pipe(new Splitter())
    .pipe(new Filter<string>(statusID => fetchedStatuses[statusID] === undefined))
    .pipe(new Batcher(100))
    .pipe(new Transformer<string[], Status[]>(transformFn, {objectMode: true}))
    .pipe(new JSONStringifier())
    .pipe(outputStream)
    .on('end', callback);
  });
}

/**
Make a custom request to the Twitter API
*/
function rest(argvparser: yargs.Argv, callback: (error?: Error) => void) {
  let argv = argvparser.options({
    method: {
      description: 'GET / POST',
    },
    // data: {
    //   description: 'querystring-encoded data to send',
    // },
    timeout: {
      description: 'timeout period (milliseconds)',
      type: 'number',
    },
    pretty: {
      description: 'prettify json output',
      type: 'boolean',
    },
  }).demand(2).argv;

  let {host, pathname, query} = urlParse(argv._[1], true);

  request({
    host: host || undefined,
    endpoint: pathname.replace(/^(\/?1\.[01])?\/?/, '').replace(/\.json$/, ''),
    method: argv.method,
    // headers: argv.headers,
    query: (argv.method !== 'POST') ? query : undefined,
    form: (argv.method === 'POST') ? query : undefined,
    timeout: argv.timeout,
  }, (error, response) => {
    if (error) return callback(error);

    readJSON(response, (error, body) => {
      if (error) return callback(error);
      console.log(JSON.stringify(body, null, argv.pretty ? '  ' : null));
      callback();
    });
  });
}

function stream(argvparser: yargs.Argv, callback: (error?: Error) => void) {
  const argv = argvparser
    .describe({
      filter: 'parameters for filter endpoint',
      sample: 'parameters for sample endpoint',
      file: 'output target (- for STDOUT)',
      interval: 'die after a silence of this many seconds (defaults to 10 minutes)',
      timeout: 'die this many seconds after starting, no matter what (default: never)',
      useragent: 'User-Agent header to send in HTTP request',
      compress: 'request gzip / deflate compression from twitter',
      ttv2: 'convert to TTV2 (defaults to false, meaning JSON)',
    })
    .boolean(['ttv2'])
    .default({
      interval: 10*60, // 10 minutes => 10 m * 60 s/m = 600 s
      compress: false,
      file: '-',
      useragent: 'twilight/stream',
    })
    .check(argv => {
      if (argv.query) {
        throw new Error('--query is not a valid argument');
      }
      if (argv.filter && argv.sample) {
        throw new Error('You cannot specify both --filter and --sample.');
      }
      return true;
    }).argv;

  // statusStreamOptions
  let {filter, sample, useragent: userAgent, compress, interval, timeout} = argv;
  let inputStream: NodeJS.ReadWriteStream = new StatusStream({filter, sample, userAgent, compress});
  // inputStream.on('error', function(err) {
  //   console.error('cli error');
    // process.exit(1);
  // })
  // inputStream.on('end', function() {
  //   console.error('cli end');
    // statusStream.end();
    // statusStream.request.abort();
    // console.error('  req', statusStream.request);
    // statusStream.response.socket.end();
    // statusStream.response.socket.destroy();
    // statusStream.response.socket.unref();
    // console.error('  res', statusStream.response);
  // });

  // ensure we get something every `interval` seconds.
  inputStream = inputStream.pipe(new Timeout(interval));

  // default: destination is STDOUT
  let outputStream = process.stdout
  if (argv.file !== '-') {
    // destination is a file
    let filepath = argv.file.replace(/TIMESTAMP/, () => {
      return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    });
    outputStream = createWriteStream(filepath, {flags: 'a', mode: 436}); // 0664 === 436
  }
  inputStream.pipe(outputStream);
  inputStream.on('error', callback);

  // hard reset timeout (optional)
  if (timeout !== undefined) {
    setTimeout(() => {
      inputStream.emit('error', new Error(`Elapsed lifetime of ${timeout}s.`));
      inputStream.end();
    }, timeout * 1000);
  }
}

/**
STDIN should be a line-delimited stream of JSON objects like
{screen_name: 'chbrown'} or {id_str: '14380188'}
*/
function users(argvparser: yargs.Argv, callback: (error?: Error) => void) {
  let argv = argvparser.argv;

  function transformFn(userIdentifiers: UserIdentifier[],
                       encoding: string,
                       callback: (error?: Error, outputChunk?: any) => void) {
    getUsers(userIdentifiers, (error, users) => {
      if (error) return callback(error);
      users.forEach(user => this.push(user));
      return callback();
    });
  }

  // process.stdin.setEncoding('utf8');
  process.stdin.resume();
  var stream = process.stdin
    .pipe(new JSONParser())
    .pipe(new Batcher(100))
    .pipe(new Transformer<UserIdentifier[], Status[]>(transformFn, {objectMode: true}))
    .pipe(new JSONStringifier())
    .pipe(process.stdout);

  stream.on('end', callback);
}

function showRestHelp() {
  TwitterAPIEndpoints.forEach(({path, method}) => {
    console.log(`${method} ${path}`);
  });
}

const commands = {stream, rest, users, statuses};

export function main() {
  var argvparser = yargs
    .usage('Usage: twilight <command> [<args>]')
    .command('stream', 'Call one of the Twitter Streaming API endpoints')
      .example('twilight stream --filter "track=bieber"', 'Start filter stream')
    .command('rest', 'Call one of the Twitter REST API endpoints')
      .example('twilight rest /geo/id/1d9a5370a355ab0c.json', 'Get information for the Chigao "place"')
    .command('users', 'Get user info from stream of screen names or user IDs')
      .example('twilight users < screen_names.txt', 'Get user profiles for the given screen names')
    .command('statuses', 'Get full status payloads from stream of status IDs')
      .example('twilight statuses < ids.txt', 'Retrieve full tweets for each status ID line in ids.txt')
    .command('rest --help', 'Print out list of Twitter REST API endpoints')
    .options({
      help: {
        description: 'print this help message',
        alias: 'h',
        type: 'boolean',
      },
      verbose: {
        description: 'print extra output',
        alias: 'v',
        type: 'boolean',
      },
      version: {
        description: 'print version',
      },
    });

  let argv = argvparser.argv;
  if (argv.verbose) {
    logger.level = Level.debug;
  }

  process.on('SIGINT', function() {
    logger.error('Ctrl+C :: SIGINT!');
    process.exit(130);
  });

  if (argv.help) {
    argvparser.showHelp();
    if (argv._[0] == 'rest') {
      showRestHelp();
    }
  }
  else if (argv.version) {
    console.log(require('../package').version);
  }
  else {
    argv = argvparser.demand(1).check((argv) => {
      let command = argv._[0];
      if (!(command in commands)) {
        throw new Error(`Unrecognized command: ${command}`);
      }
      return true;
    }).argv;

    let command = argv._[0];
    commands[command](argvparser, error => {
      if (error) {
        console.error(error.toString());
        process.exit(1);
      }
      process.exit(0);
    });
  }
}
