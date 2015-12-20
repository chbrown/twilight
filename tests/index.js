import assert from 'assert';
import {describe, it} from 'mocha';
import {Parser as JSONParser} from 'streaming/json';
import {request, getStatuses, getPlaceInformation, StatusStream,
        getUsers, getUserFollowers, getUserFriends, getUserStatuses} from '../';
import {getOAuth} from '../credentials';

describe('twilight rest', () => {
  it('should read OAuth credentials', done => {
    getOAuth((error, oauth) => {
      assert.ifError(error);
      assert(oauth);
      done();
    });
  });

  it('should make geo/id request for Chicago place information', done => {
    getPlaceInformation('1d9a5370a355ab0c', (error, place) => {
      assert.ifError(error);

      let text = JSON.stringify(place);
      assert(/Chicago, IL/.test(text),
        'Rest call output does not contain expected string, "Chicago, IL".');
      done();
    });
  });

  it('should make users/lookup request for @tree_bro', done => {
    getUsers([{screen_name: 'tree_bro'}], (error, users) => {
      assert.ifError(error);

      let text = JSON.stringify(users);
      assert(/Jackson/.test(text), 'users/lookup response should contain the word "Jackson"');
      assert(/Oregon/.test(text), 'users/lookup response should contain the word "Oregon"');
      done();
    });
  });

  it('should make users/lookup request for @chbrown by ID', done => {
    getUsers([{id_str: '14380188'}], (error, users) => {
      assert.ifError(error);

      let text = JSON.stringify(users);
      assert(/chbrown/.test(text), 'users/lookup response should contain the word "chbrown"');
      done();
    });
  });

  it('should make followers/ids request for @chbrown', done => {
    getUserFollowers({screen_name: 'chbrown'}, (error, userIDs) => {
      assert.ifError(error);

      assert(userIDs.length > 100, `@chbrown should have more than 100 followers (actual: ${userIDs.length})`);
      done();
    });
  });

  it('should make friends/ids request for @chbrown by ID', done => {
    getUserFriends({id_str: '14380188'}, (error, userIDs) => {
      assert.ifError(error);

      assert(userIDs.length > 100, `@chbrown should have more than 100 friends (actual: ${userIDs.length})`);
      done();
    });
  });

  it('should make statuses/lookup request for three tweets', done => {
    getStatuses(['652708289713586176', '643643919410946048', '111111111111111111'], (error, statuses) => {
      assert.ifError(error);

      assert(statuses.length === 3, 'should retrieve 3 tweets');

      let text = JSON.stringify(statuses);
      assert(text.includes('Uggh, pattern order matters'), 'tweets should contain the phrase "Uggh, pattern order matters"');
      assert(text.includes('confuses correlation with causation'), 'tweets should contain the phrase "confuses correlation with causation"');
      assert(statuses[2].missing, 'The status ID "111111111111111111" should be missing');
      done();
    });
  });

  it('should make statuses/user_timeline request for @chbrown', done => {
    getUserStatuses({screen_name: 'chbrown'}, '677168870700920832', (error, statuses) => {
      assert.ifError(error);

      assert(statuses.length === 200, 'should retrieve 200 tweets');

      let text = JSON.stringify(statuses);
      assert(text.includes('Spelling Bee'), 'tweets should contain the phrase "Spelling Bee"');
      assert(text.includes('a guy in this coffee shop sitting at a table'), 'tweets should should contain the phrase "a guy in this coffee shop sitting at a table"');
      done();
    });
  });

  it('should make request with invalid endpoint and get error', done => {
    request({endpoint: 'doesnt/exist'}, (error, response) => {
      assert(error && error.message.includes('not a valid Twitter API Endpoint'),
        'Invalid endpoint should callback with error');
      assert(response === undefined, 'Invalid endpoint should not callback with response body');
      done();
    });
  });
});

describe('twilight stream', () => {
  it('should start new StatusStream (with filter) and collect tweets', done => {
    var chunks = [];

    const twitterStream = new StatusStream({
      filter: 'track=bieber',
    })
    .on('data', chunk => chunks.push(chunk))
    .on('error', err => {
      assert.equal(err.message, 'Elapsed lifetime of 2s.', 'error should be a hard timeout');
    })
    .on('end', () => {
      let text = chunks.join();
      assert(/justin/i.test(text), 'stream output should contain string "justin"');
      done();
    });

    setTimeout(() => {
      twitterStream.emit('error', new Error('Elapsed lifetime of 2s.'));
      twitterStream.end();
    }, 2000);

  });

  it('should start new StatusStream (unfiltered sample, compressed) and collect tweets', done => {
    var statuses = [];

    const twitterStream = new StatusStream({compress: true})
    .on('error', err => {
      assert.equal(err.message, 'Elapsed lifetime of 2s.', 'error should be a hard timeout');
    });

    twitterStream.pipe(new JSONParser())
    .on('data', status => statuses.push(status))
    .on('end', () => {
      // let text = JSON.stringify(statuses);
      assert(statuses.length > 10, 'should retrieve more than 10 statuses in 2 seconds');
      done();
    });

    setTimeout(() => {
      twitterStream.emit('error', new Error('Elapsed lifetime of 2s.'));
      twitterStream.end();
    }, 2000);
  });
});
