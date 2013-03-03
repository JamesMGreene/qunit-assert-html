# QUnit HTML assertion addon

This addon for [QUnit](https://github.com/jquery/qunit) adds `QUnit.assert.htmlEqual` and `QUnit.assert.notHtmlEqual` assertion methods to test that two HTML strings are equivalent (or not) after a rigorous normalization process.

## Usage
```js
QUnit.assert.htmlEqual(actual, expected [, message]);
QUnit.assert.notHtmlEqual(actual, expected [, message]);
```

## Examples
```js
QUnit.assert.htmlEqual('<B TITLE=test>test</B>', '<b title="test">test</b>');
```

For more examples, refer to the unit tests.

## Compatibility
 - **Browsers**: This addon currently works in IE7+ (IE6 untested) but does not fully normalize certain CSS style properties (e.g. color values) in IE < 9. For a little more info, see [QUnit PR #368](https://github.com/jquery/qunit/pull/368).
 - **Node.js**: This addon has not been tested in Node.js.  However, it does require DOM support for iframes, so you would need to utilize [jsdom](https://github.com/tmpvar/jsdom), [Cheerio](https://github.com/MatthewMueller/cheerio), etc., to make it work at all.

## Documentation
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2013 James M. Greene  
Licensed under the MIT license.
