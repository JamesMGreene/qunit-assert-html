[![Build Status](https://travis-ci.org/JamesMGreene/qunit-assert-html.png?branch=master)](https://travis-ci.org/JamesMGreene/qunit-assert-html) [![NPM version](https://badge.fury.io/js/qunit-assert-html.png)](https://www.npmjs.com/package/qunit-assert-html)

# QUnit HTML assertion plugin

This plugin for [QUnit](https://github.com/jquery/qunit) adds `htmlEqual` and `notHtmlEqual` (plus alias `htmlNotEqual`) assertion methods to test that two HTML strings are equivalent (or not) after a rigorous normalization process.

## Usage
```js
assert.htmlEqual(actual, expected [, message]);
assert.notHtmlEqual(actual, expected [, message]);  // Alias: `assert.htmlNotEqual`
```

## Examples
```js
test('Example unit test', function(assert) {
  assert.htmlEqual('<B TITLE=test>test</B>', '<b title="test">test</b>');
  assert.notHtmlEqual('<br />', '<hr />');
});
```

For more examples, refer to the unit tests.


## Compatibility
 - **Browsers**: This plugin currently works in IE7+ (IE6 untested) but does not fully normalize certain CSS style properties (e.g. color values) in IE < 9. For a little more info, see [QUnit PR #368](https://github.com/jquery/qunit/pull/368).
 - **Node.js**: This plugin has not been tested in Node.js.  However, it does require DOM support for iframes, so you would need to utilize [jsdom](https://github.com/tmpvar/jsdom), [Cheerio](https://github.com/MatthewMueller/cheerio), etc., to make it work at all.


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](http://gruntjs.com/).


## License
Copyright (c) 2013-2015 James M. Greene
Licensed under the MIT license.
