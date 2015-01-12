(function(module, test) {
	'use strict';

	var deepEqualIgnoringUnlistedStyleRules = null,
		assertStylePropIsColor = null,
		assertFontWeightIsBold = null,
		assertBackgroundImageIsNone = null;

	// Set `deepEqualIgnoringUnlistedStyleRules`
	(function() {
		var objectKeys = Object.keys || (function() {
				var hasOwn = function( obj, propName ) {
					return Object.prototype.hasOwnProperty.call( obj, propName );
				};
				return function(obj) {
					var keys = [],
						key;
					for (key in obj) {
						if (hasOwn(obj, key)) {
							keys.push(key);
						}
					}
					return keys;
				};
			})(),
			arrayIndexOf = function(arr, item) {
				if (typeof arr.indexOf === 'function') {
					return arr.indexOf(item);
				}
				else {
					for (var i = 0, len = arr.length; i < len; i++) {
						if (arr[i] === item) {
							return i;
						}
					}
					return -1;
				}
			},
			removeUnlistedStyleRulesFromSerializedElementNode = function(serializedElementNode, listedStyleRules) {
				var cleanedSerializedElementNode = {},
					cleanedStyleRules = {},
					i, elKeys, elKey,
					j, attrs, attrKeys, attrKey, attrVal, cleanedAttrs, kids, kid, cleanedKids,
					k, styleRuleKeys, styleRuleKey;

				if (!listedStyleRules) {
					listedStyleRules = [];
				}

				elKeys = objectKeys(serializedElementNode);
				for (i = 0; i < elKeys.length; i++) {
					elKey = elKeys[i];

					if (elKey === "Attributes") {
						attrs = serializedElementNode.Attributes;
						cleanedAttrs = {};

						// MOAR ITERATION!!!
						attrKeys = objectKeys(attrs);
						for (j = 0; j < attrKeys.length; j++) {
							attrKey = attrKeys[j];

							if (attrKey !== "style") {
								cleanedAttrs[attrKey] = attrs[attrKey];
							}
							else {
								attrVal = attrs[attrKey];
								styleRuleKeys = objectKeys(attrVal);
								for (k = 0; k < styleRuleKeys.length; k++) {
									styleRuleKey = styleRuleKeys[k];

									if (arrayIndexOf(listedStyleRules, styleRuleKey) !== -1) {
										cleanedStyleRules[styleRuleKey] = attrVal[styleRuleKey];
									}
								}

								if (objectKeys(cleanedStyleRules).length) {
									cleanedAttrs[attrKey] = cleanedStyleRules;
								}
							}
						}
						cleanedSerializedElementNode.Attributes = cleanedAttrs;
					}
					else if (elKey === "ChildNodes") {
						kids = serializedElementNode.ChildNodes;
						cleanedKids = new Array(kids.length);
						for (j = 0; j < kids.length; j++) {
							kid = kids[j];
							// MOAR RECURSION!!!
							if (kid.NodeType === 1) {
								cleanedKids[j] = removeUnlistedStyleRulesFromSerializedElementNode(kid, listedStyleRules);
							}
							else {
								cleanedKids[j] = kid;
							}
						}
						cleanedSerializedElementNode.ChildNodes = cleanedKids;
					}
					else {
						cleanedSerializedElementNode[elKey] = serializedElementNode[elKey];
					}
				}
				return cleanedSerializedElementNode;
			},
			removeUnlistedStyleRulesFromSerializedNodes = function(actual, expected) {
				var actualLength = actual.length,
					cleanedActual = new Array(actualLength),
					i, attrs, listedStyleRules;

				for (i = 0; i < actualLength; i++) {
					if (actual[i].NodeType === 1) {
						listedStyleRules = [];
						attrs = expected[i].Attributes;
						if (attrs && attrs['style']) {
							listedStyleRules = objectKeys(attrs['style']);
						}
						cleanedActual[i] = removeUnlistedStyleRulesFromSerializedElementNode(actual[i], listedStyleRules);
					}
					else {
						cleanedActual[i] = actual[i];
					}
				}
				return cleanedActual;
			};

		deepEqualIgnoringUnlistedStyleRules = function(assert, actual, expected, message) {
			if (!message) {
				message = "Serialized nodes are equivalent, ignoring unlisted attributes";
			}
			assert.deepEqual(removeUnlistedStyleRulesFromSerializedNodes(actual, expected), expected, message);
		};
	})();

	// Set `assertStylePropIsColor` and `assertFontWeightIsBold`
	(function() {
		var redColorRegex = /^(red|rgb\(255,\s*0,\s*0\)|#F00|#FF0000)$/i,
			greenColorRegex = /^(green|rgb\(0,\s*255,\s*0\)|#0F0|#00FF00)$/i,
			boldRegex = /^(bold|700)$/i;

		assertStylePropIsColor = function(assert, serializedElementNode, stylePropName, colorName) {
			var styleProp = serializedElementNode.Attributes.style[stylePropName],
				colorRegex = (function() {
					switch (colorName.toLowerCase()) {
						case 'red':
							return redColorRegex;
						case 'green':
							return greenColorRegex;
						default:
							throw new Error('Unexpected value for `colorName`: "' + colorName + '"');
					}
				})();
			assert.strictEqual(colorRegex.test(styleProp), true, (stylePropName + ': ' + colorName));
		};

		assertFontWeightIsBold = function(assert, serializedElementNode) {
			var fontWeightStyle = serializedElementNode.Attributes.style.fontWeight;
			assert.strictEqual(boldRegex.test(fontWeightStyle), true, 'fontWeight: bold');
		};
	})();

	assertBackgroundImageIsNone = function(assert, serializedElementNode) {
		var result = !!serializedElementNode && !!serializedElementNode.Attributes;
		if (result && !!serializedElementNode.Attributes.style) {
			var bgImage = serializedElementNode.Attributes.style.backgroundImage;
			if (bgImage) {
				result = result && /^none$/ig.test(bgImage);
			}
		}
		assert.strictEqual(result, true, 'backgroundImage: none');
	};



	module('qunit-assert-html plugin tests');

	test('Equivalent HTML - Identical text nodes are equivalent without normalization', function(assert) {
		assert.htmlEqual('test', 'test');

		assert.deepEqual(
			assert._serializeHtml('test'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: "test"
				}
			]
		);
	});

	test('Equivalent HTML - Identical elements are equivalent without normalization', function(assert) {
		assert.htmlEqual('<b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Identical singleton/empty elements are equivalent without normalization', function(assert) {
		assert.htmlEqual('<br />', '<br />');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<br />'),
			[
				{
					NodeType: 1,
					NodeName: 'br',
					Attributes: {},
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming preceding space(s)', function(assert) {
		assert.htmlEqual('  test', 'test');

		assert.deepEqual(
			assert._serializeHtml('  test'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming preceding tab(s)', function(assert) {
		assert.htmlEqual('\ttest', 'test');

		assert.deepEqual(
			assert._serializeHtml('\ttest'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming preceding newline(s)', function(assert) {
		assert.htmlEqual('\ntest', 'test');

		assert.deepEqual(
			assert._serializeHtml('\ntest'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming following space(s)', function(assert) {
		assert.htmlEqual('test  ', 'test');

		assert.deepEqual(
			assert._serializeHtml('test  '),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming following tab(s)', function(assert) {
		assert.htmlEqual('test\t', 'test');

		assert.deepEqual(
			assert._serializeHtml('test\t'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming following newline(s)', function(assert) {
		assert.htmlEqual('test\n', 'test');

		assert.deepEqual(
			assert._serializeHtml('test\n'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming preceding space(s)', function(assert) {
		assert.htmlEqual('  <b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('  <b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming preceding tab(s)', function(assert) {
		assert.htmlEqual('\t<b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('\t<b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming preceding newline(s)', function(assert) {
		assert.htmlEqual('\n<b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('\n<b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming following space(s)', function(assert) {
		assert.htmlEqual('<b>test</b>  ', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b>test</b>  '),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming following tab(s)', function(assert) {
		assert.htmlEqual('<b>test</b>\t', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b>test</b>\t'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming following newline(s)', function(assert) {
		assert.htmlEqual('<b>test</b>\n', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b>test</b>\n'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - IE element tag name uppercasing', function(assert) {
		assert.htmlEqual('<B>test</B>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<B>test</B>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - IE attribute name uppercasing', function(assert) {
		assert.htmlEqual('<b TITLE="testAttr">test</b>', '<b title="testAttr">test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b TITLE="testAttr">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'title': 'testAttr'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - IE attribute optimization drops "unnecessary" quotes', function(assert) {
		assert.htmlEqual('<b title=testAttr>test</b>', '<b title="testAttr">test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b title=testAttr>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'title': 'testAttr'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Singleton/empty elements with and without insignificant whitespace', function(assert) {
		assert.htmlEqual('<br/>', '<br />');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<br/>'),
			[
				{
					NodeType: 1,
					NodeName: 'br',
					Attributes: {},
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Singleton/empty elements without self-closing slash', function(assert) {
		assert.htmlEqual('<br>', '<br />');

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<br>'),
			[
				{
					NodeType: 1,
					NodeName: 'br',
					Attributes: {},
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Possible attribute reordering based on alphabetical order', function(assert) {
		assert.htmlEqual(
			'<b class="className" id="guid" lang="en" title="titleText">test</b>',
			'<b id="guid" class="className" title="titleText" lang="en">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b class="className" id="guid" lang="en" title="titleText">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'class': 'className',
						'id': 'guid',
						'lang': 'en',
						'title': 'titleText'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Possible attribute reordering based on superficial attribute prioritization for `input` elements', function(assert) {
		assert.htmlEqual(
			'<input id="guid" type="text" value="blah" size="5" />',
			'<input id="guid" type="text" size="5" value="blah" />'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<input id="guid" type="text" value="blah" size="5" />'),
			[
				{
					NodeType: 1,
					NodeName: 'input',
					Attributes: {
						'id': 'guid',
						'size': '5',
						'type': 'text',
						'value': 'blah'
					},
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Possible attribute reordering based on superficial attribute prioritization for `input` elements without self-closing slash', function(assert) {
		// From: http://stackoverflow.com/questions/9227517/firefox-tag-attributes-badly-reordered-after-html-parse
		assert.htmlEqual(
			'<input id="guid" type="text" value="blah" size="5">',
			'<input id="guid" type="text" size="5" value="blah">'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<input id="guid" type="text" value="blah" size="5">'),
			[
				{
					NodeType: 1,
					NodeName: 'input',
					Attributes: {
						'id': 'guid',
						'size': '5',
						'type': 'text',
						'value': 'blah'
					},
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Normalize `class` attribute with preceding space(s)', function(assert) {
		assert.htmlEqual(
			'<b class=" class1">test</b>',
			'<b class="class1">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b class=" class1">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'class': 'class1'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Normalize `class` attribute with following space(s)', function(assert) {
		assert.htmlEqual(
			'<b class="class2 ">test</b>',
			'<b class="class2">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b class="class2 ">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'class': 'class2'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Normalize `class` attribute with in-between multiple space(s)', function(assert) {
		assert.htmlEqual(
			'<b class="class1  class2">test</b>',
			'<b class="class1 class2">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b class="class1  class2">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'class': 'class1 class2'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Normalize `class` attribute with preceding, in-between, and following whitespace character(s)', function(assert) {
		assert.htmlEqual(
			'<b class="\t\n class1 \t\r\n class2 \n\t">test</b>',
			'<b class="class1 class2">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			assert,
			assert._serializeHtml('<b class="\t\n class1 \t\r\n class2 \n\t">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'class': 'class1 class2'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - An overridden single rule', function(assert) {
		assert.htmlEqual(
			'<b style="font-weight:normal; font-weight:bold;">test</b>',
			'<b style="font-weight:bold;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="font-weight:normal; font-weight:bold;">test</b>');
		// Validate everything but fontWeight
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate fontWeight
		assertFontWeightIsBold(assert, serializedActual[0]);
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Named colors with casing differences', function(assert) {
		assert.htmlEqual(
			'<b style="color:Red;">test</b>',
			'<b style="color:red;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="color:Red;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: { /* Cannot validate `color` this way */ },
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate color
		assertStylePropIsColor(assert, serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Hex vs. named colors', function(assert) {
		assert.htmlEqual(
			'<b style="color:#FF0000;">test</b>',
			'<b style="color:red;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="color:#FF0000;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: { /* Cannot validate `color` this way */ },
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate color
		assertStylePropIsColor(assert, serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Hex colors with casing differences', function(assert) {
		assert.htmlEqual(
			'<b style="color:#ff0000;">test</b>',
			'<b style="color:#FF0000;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="color:#ff0000;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: { /* Cannot validate `color` this way */ },
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate color
		assertStylePropIsColor(assert, serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Hex colors shorthand vs. normal form', function(assert) {
		assert.htmlEqual(
			'<b style="color:#F00;">test</b>',
			'<b style="color:#FF0000;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="color:#F00;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: { /* Cannot validate `color` this way */ },
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate color
		assertStylePropIsColor(assert, serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - RGB vs. hex colors', function(assert) {
		assert.htmlEqual(
			'<b style="color:rgb(255, 0, 0);">test</b>',
			'<b style="color:#FF0000;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="color:rgb(255, 0, 0);">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: { /* Cannot validate `color` this way */ },
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate color
		assertStylePropIsColor(assert, serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Rules in different orders', function(assert) {
		assert.htmlEqual(
			'<b style="font-weight:bold; color:red;">test</b>',
			'<b style="color:red; font-weight:bold;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="font-weight:bold; color:red;">test</b>');
		// Validate everything but color and fontWeight
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate fontWeight
		assertFontWeightIsBold(assert, serializedActual[0]);
		// Validate color
		assertStylePropIsColor(assert, serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Shorthand rule vs. individual normal form rules', function(assert) {
		assert.htmlEqual(
			'<b style="border:5px solid red;">test</b>',
			'<b style="border-width:5px; border-style:solid; border-color:red;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="border:5px solid red;">test</b>');
		// Validate everything but borderColor
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'style': {
							'borderTopWidth': '5px',
							'borderTopStyle': 'solid',
							'borderRightWidth': '5px',
							'borderRightStyle': 'solid',
							'borderBottomWidth': '5px',
							'borderBottomStyle': 'solid',
							'borderLeftWidth': '5px',
							'borderLeftStyle': 'solid'
							/* Cannot validate `border*Color` this way */
						}
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate borderColor
		assertStylePropIsColor(assert, serializedActual[0], 'borderTopColor', 'red');
		assertStylePropIsColor(assert, serializedActual[0], 'borderRightColor', 'red');
		assertStylePropIsColor(assert, serializedActual[0], 'borderBottomColor', 'red');
		assertStylePropIsColor(assert, serializedActual[0], 'borderLeftColor', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - An overridden shorthand rule fully overrides its previous state', function(assert) {
		assert.htmlEqual(
			'<b style="background: url(smiley.gif); background: red;">test</b>',
			'<b style="background: red;">test</b>'
		);

		var serializedActual = assert._serializeHtml('<b style="background: url(smiley.gif); background: red;">test</b>');
		// Validate everything but backgroundColor and backgroundImage
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				}
			]
		);
		// Validate backgroundColor
		assertStylePropIsColor(assert, serializedActual[0], 'backgroundColor', 'red');
		// Validate backgroundImage
		assertBackgroundImageIsNone(assert, serializedActual[0]);
	});

	test('Equivalent HTML - Multiple root elements', function(assert) {
		assert.htmlEqual(
			'<b title=strong>test</b><i title=em>ing</i>',
			'<b title="strong">test</b><i title="em">ing</i>'
		);

		var serializedActual = assert._serializeHtml('<b title=strong>test</b><i title=em>ing</i>');
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {
						'title': 'strong'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				},
				{
					NodeType: 1,
					NodeName: 'i',
					Attributes: {
						'title': 'em'
					},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'ing'
						}
					]
				}
			]
		);
	});

	test('Equivalent HTML - Multiple root nodes', function(assert) {
		assert.htmlEqual(
			'<B>test</B>ing<I>!</I>',
			'<b>test</b>ing<i>!</i>'
		);

		var serializedActual = assert._serializeHtml('<B>test</B>ing<I>!</I>');
		deepEqualIgnoringUnlistedStyleRules(
			assert,
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: 'test'
						}
					]
				},
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'ing'
				},
				{
					NodeType: 1,
					NodeName: 'i',
					Attributes: {},
					ChildNodes: [
						{
							NodeType: 3,
							NodeName: '#text',
							NodeValue: '!'
						}
					]
				}
			]
		);
	});

	test('Inequivalent HTML', function(assert) {
		assert.notHtmlEqual(
			'test fail',
			'TEST FAIL',
			'Text node value casing differences cause inequality'
		);

		assert.notHtmlEqual(
			'test fail',
			'<b>test fail</b>',
			'Different DOM structure causes inequality'
		);

		assert.notHtmlEqual(
			'<b>test fail</b>',
			'<i>test fail</i>',
			'Same DOM structure but different elements causes inequality'
		);

		assert.notHtmlEqual(
			'<b>test fail</b>',
			'<b>test <i>fail</i></b>',
			'Extra internal element wrappers cause inequality'
		);

		assert.notHtmlEqual(
			'<b title="TEST">test</b>',
			'<b title="test">test</b>',
			'Attribute value casing differences cause inequality'
		);

		assert.notHtmlEqual(
			'<b id="actual">test fail</b>',
			'<b id="expected">test fail</b>',
			'Attribute value differences cause inequality'
		);

		assert.notHtmlEqual(
			'<b class="class1 class2">test fail</b>',
			'<b class="class2 class1">test fail</b>',
			'CSS class name ordering differences cause inequality'
		);

		assert.notHtmlEqual(
			'<b style="color:red;">test</b>',
			'<b style="color:green;">test</b>',
			'Computed style differences for a single rule cause inequality'
		);

		assert.notHtmlEqual(
			'<b style="font-weight:100; font-weight:900;">test</b>',
			'<b style="font-weight:100;">test</b>',
			'Computed style differences for an overridden single rule cause inequality'
		);

		assert.notHtmlEqual(
			'<b style="font-weight:bold; color:red;">test</b>',
			'<b style="font-weight:bold;">test</b>',
			'Computed style differences over all rules cause inequality'
		);

		assert.notHtmlEqual(
			'<b>test</b>',
			'<b>test</b><b>ing</b>',
			'Different number of nodes (and different overall text content) cause inequality'
		);

		assert.notHtmlEqual(
			'<b>testing</b>',
			'<b>test</b><b>ing</b>',
			'Different number of nodes (but same overall text content) cause inequality'
		);

		assert.notHtmlEqual(
			'<b>testing</b>',
			'<b>test</b>ing',
			'Different number of nodes (and node types) cause inequality'
		);
	});

	test('Alias `htmlNotEqual` assertion method exists', function(assert) {
	  assert.expect(2);

	  assert.strictEqual(typeof assert.notHtmlEqual, 'function', 'Primary `notHtmlEqual` assertion method exists');
	  assert.strictEqual(assert.htmlNotEqual, assert.notHtmlEqual, 'Secondary alias `htmlNotEqual` assertion method exists');
	});

})(QUnit.module, QUnit.test);