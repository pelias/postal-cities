
var selectLocality = require('../../src/selectLocality');

module.exports.http = function(test, common) {
  test('http error', function(t) {
    const locality = selectLocality(null, 'http error');
    t.equal( locality.err, 'http error' );
    t.end();
  });
};

module.exports.res = function(test, common) {
  test('res not set', function(t) {
    const locality = selectLocality(null, null, null);
    t.equal( locality.err, 'no body' );
    t.end();
  });
  test('res.body not set', function(t) {
    const locality = selectLocality(null, null, {});
    t.equal( locality.err, 'no body' );
    t.end();
  });
  test('res.body.length', function(t) {
    const locality = selectLocality(null, null, {body: []});
    t.equal( locality.err, 'no body' );
    t.end();
  });
};

module.exports.coord = function(test, common) {
  test('invalid lat', function(t) {
    const locality = selectLocality({ lon: '1' }, null, {body: [{}]});
    t.equal( locality.err, 'invalid coord' );
    t.end();
  });
  test('invalid lon', function(t) {
    const locality = selectLocality({ lat: '1' }, null, {body: [{}]});
    t.equal( locality.err, 'invalid coord' );
    t.end();
  });
};

module.exports.geom = function(test, common) {
  test('missing match.geom', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{}]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
  test('missing match.geom.lat', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lon: '1'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
  test('missing match.geom.lon', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '1'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
  test('invalid match.geom.lat', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: 'a',
        lon: '1'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
  test('invalid match.geom.lon', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '1',
        lon: 'a'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
};

module.exports.lineage = function(test, common) {
  test('invalid match.lineage', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '1',
        lon: '1'
      },
      lineage: []
    }]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
};

module.exports.country = function(test, common) {
  test('country', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '1',
        lon: '1'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.false( locality.err );
    t.deepEqual( locality.candidates, [{
      km: 0,
      wofid: 100,
      name_english: 'Locality 1',
      name_abbr: undefined,
      placetype: 'locality',
      country_name: 'Sealand',
      country_abbr: 'SEA'
    }]);
    t.end();
  });
}

module.exports.dependency = function(test, common) {
  test('dependency', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '1',
        lon: '1'
      },
      lineage: [
        {
          dependency: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.false( locality.err );
    t.deepEqual( locality.candidates, [{
      km: 0,
      wofid: 100,
      name_english: 'Locality 1',
      name_abbr: undefined,
      placetype: 'locality',
      country_name: 'Sealand',
      country_abbr: 'SEA'
    }]);
    t.end();
  });
}

module.exports.calcCrow = function(test, common) {
  test('match too far away', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '3',
        lon: '3'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.equal( locality.err, 'no candidates found' );
    t.end();
  });
}

module.exports.multiple = function(test, common) {
  test('multiple matches, closest first', function(t) {
    const locality = selectLocality({ lon: '1', lat: '1' }, null, {body: [{
      id: 100,
      name: 'Locality 1',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '2',
        lon: '2'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    },{
      id: 101,
      name: 'Locality 2',
      abbr: undefined,
      placetype: 'locality',
      geom: {
        lat: '1.5',
        lon: '1.5'
      },
      lineage: [
        {
          country: {
            name: 'Sealand',
            abbr: 'SEA'
          }
        }
      ]
    }]});
    t.false( locality.err );
    t.deepEqual( locality.candidates, [{
      km: 78.61720677100743,
      wofid: 101,
      name_english: 'Locality 2',
      name_abbr: undefined,
      placetype: 'locality',
      country_name: 'Sealand',
      country_abbr: 'SEA'
    },{
      km: 157.22543203807288,
      wofid: 100,
      name_english: 'Locality 1',
      name_abbr: undefined,
      placetype: 'locality',
      country_name: 'Sealand',
      country_abbr: 'SEA'
    }]);
    t.end();
  });
}