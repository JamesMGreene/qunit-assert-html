/*global QUnit:false, module:false, test:false */
(function() {
	'use strict';

	var deepEqualIgnoringUnlistedStyleRules = null,
		notDeepEqualIgnoringUnlistedStyleRules = null,
		assertStylePropIsColor = null,
		assertFontWeightIsBold = null,
		assertBackgroundImageIsNone = null;

	// Set `deepEqualIgnoringUnlistedStyleRules` and `notDeepEqualIgnoringUnlistedStyleRules`
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
					cleanedStyleAttr = {},
					cleanedStyleRules = {},
					i, elKeys, elKey,
					j, attrs, attr, cleanedAttrs, kids, kid, cleanedKids,
					k, styleAttrKey, styleAttrKeys,
					l, styleRuleKeys, styleRuleKey;

				if (!listedStyleRules) {
					listedStyleRules = [];
				}

				elKeys = objectKeys(serializedElementNode);
				for (i = 0; i < elKeys.length; i++) {
					elKey = elKeys[i];

					if (elKey === "Attributes") {
						attrs = serializedElementNode.Attributes;
						cleanedAttrs = [];

						// MOAR ITERATION!!!
						for (j = 0; j < attrs.length; j++) {
							attr = attrs[j];

							if (attr.NodeName !== "style") {
								cleanedAttrs.push(attr);
							}
							else {
								styleAttrKeys = objectKeys(attr);
								for (k = 0; k < styleAttrKeys.length; k++) {
									styleAttrKey = styleAttrKeys[k];
									if (styleAttrKey !== "NodeValue") {
										cleanedStyleAttr[styleAttrKey] = attr[styleAttrKey];
									}
									else {
										styleRuleKeys = objectKeys(attr.NodeValue);
										for (l = 0; l < styleRuleKeys.length; l++) {
											styleRuleKey = styleRuleKeys[l];

											if (arrayIndexOf(listedStyleRules, styleRuleKey) !== -1) {
												cleanedStyleRules[styleRuleKey] = attr.NodeValue[styleRuleKey];
											}
										}

										if (objectKeys(cleanedStyleRules).length) {
											cleanedStyleAttr.NodeValue = cleanedStyleRules;
										}
										else {
											cleanedStyleAttr = null;
										}
									}
								}
								if (cleanedStyleAttr) {
									cleanedAttrs.push(cleanedStyleAttr);
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
					i, j, attrs, listedStyleRules;

				for (i = 0; i < actualLength; i++) {
					if (actual[i].NodeType === 1) {
						listedStyleRules = [];
						attrs = expected[i].Attributes;
						if (attrs) {
							for (j = 0; j < attrs.length; j++) {
								if (attrs[j].NodeName === "style") {
									listedStyleRules = objectKeys(attrs[j].NodeValue);
									break;
								}
							}
						}
						cleanedActual[i] = removeUnlistedStyleRulesFromSerializedElementNode(actual[i], listedStyleRules);
					}
					else {
						cleanedActual[i] = actual[i];
					}
				}
				return cleanedActual;
			};

		deepEqualIgnoringUnlistedStyleRules = function(actual, expected, message) {
			if (!message) {
				message = "Serialized nodes are equivalent, ignoring unlisted attributes";
			}
			QUnit.deepEqual(removeUnlistedStyleRulesFromSerializedNodes(actual, expected), expected, message);
		};

		notDeepEqualIgnoringUnlistedStyleRules = function(actual, expected, message) {
			if (!message) {
				message = "Serialized nodes are not equivalent, even after ignoring unlisted attributes";
			}
			QUnit.notDeepEqual(removeUnlistedStyleRulesFromSerializedNodes(actual, expected), expected, message);
		};
	})();

	// Set `assertStylePropIsColor` and `assertFontWeightIsBold`
	(function() {
		var assertStylePropExists = function(serializedElementNode, stylePropName) {
			QUnit.ok(serializedElementNode);
			QUnit.ok(serializedElementNode.Attributes);
			QUnit.strictEqual(serializedElementNode.Attributes.length > 0, true);

			var styleAttributeIndex = (function(attrs) {
				for (var i = 0, len = attrs.length; i < len; i++) {
					if (attrs[i].NodeName === 'style') {
						return i;
					}
				}
				return -1;
			})(serializedElementNode.Attributes);

			QUnit.notStrictEqual(styleAttributeIndex, -1);
			QUnit.ok(serializedElementNode.Attributes[styleAttributeIndex]);
			QUnit.strictEqual(serializedElementNode.Attributes[styleAttributeIndex].NodeType, 2);
			QUnit.strictEqual(serializedElementNode.Attributes[styleAttributeIndex].NodeName, 'style');
			QUnit.ok(serializedElementNode.Attributes[styleAttributeIndex].NodeValue);

			var stylePropVal = serializedElementNode.Attributes[styleAttributeIndex].NodeValue[stylePropName];
			QUnit.ok(stylePropVal);
			return stylePropVal;
		};

		assertStylePropIsColor = function(serializedElementNode, stylePropName, colorName) {
			var styles = assertStylePropExists(serializedElementNode, stylePropName),
				colorRegex = (function(colorName) {
					switch (colorName.toLowerCase()) {
						case 'red':
							return /^(red|rgb\(255,\s*0,\s*0\)|#F00|#FF0000)$/ig;
						case 'green':
							return /^(green|rgb\(0,\s*255,\s*0\)|#0F0|#00FF00)$/ig;
						default:
							throw new Error('Unexpected value for `colorName`: "' + colorName + '"');
					}
				})(colorName);

			QUnit.strictEqual(colorRegex.test(styles), true);
		};

		assertFontWeightIsBold = function(serializedElementNode) {
			var styles = assertStylePropExists(serializedElementNode, 'fontWeight'),
				boldRegex = /^(bold|700)$/ig;

			QUnit.strictEqual(boldRegex.test(styles), true);
		};
	})();

	assertBackgroundImageIsNone = function(serializedElementNode) {
		QUnit.ok(serializedElementNode);
		QUnit.ok(serializedElementNode.Attributes);

		if (serializedElementNode.Attributes.length) {
			var styleAttributeIndex = (function(attrs) {
				for (var i = 0, len = attrs.length; i < len; i++) {
					if (attrs[i].NodeName === 'style') {
						return i;
					}
				}
				return -1;
			})(serializedElementNode.Attributes);

			if (styleAttributeIndex !== -1) {
				QUnit.ok(serializedElementNode.Attributes[styleAttributeIndex]);
				QUnit.strictEqual(serializedElementNode.Attributes[styleAttributeIndex].NodeType, 2);
				QUnit.strictEqual(serializedElementNode.Attributes[styleAttributeIndex].NodeName, 'style');
				QUnit.ok(serializedElementNode.Attributes[styleAttributeIndex].NodeValue);

				var bgImage = serializedElementNode.Attributes[styleAttributeIndex].NodeValue['backgroundImage'];
				if (bgImage) {
					QUnit.strictEqual(/^none$/ig.test(bgImage), true);
				}
			}
		}
	};

	module('qunit-html addon tests');

	test('Equivalent HTML - Identical text nodes are equivalent without normalization', function() {
		QUnit.htmlEqual('test', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('test'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: "test"
				}
			]
		);
	});

	test('Equivalent HTML - Identical elements are equivalent without normalization', function() {
		QUnit.htmlEqual('<b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - Identical singleton/empty elements are equivalent without normalization', function() {
		QUnit.htmlEqual('<br />', '<br />');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<br />'),
			[
				{
					NodeType: 1,
					NodeName: 'br',
					Attributes: [],
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming preceding space(s)', function() {
		QUnit.htmlEqual('  test', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('  test'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming preceding tab(s)', function() {
		QUnit.htmlEqual('\ttest', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('\ttest'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming preceding newline(s)', function() {
		QUnit.htmlEqual('\ntest', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('\ntest'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming following space(s)', function() {
		QUnit.htmlEqual('test  ', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('test  '),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming following tab(s)', function() {
		QUnit.htmlEqual('test\t', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('test\t'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Text nodes are equivalent after trimming following newline(s)', function() {
		QUnit.htmlEqual('test\n', 'test');

		QUnit.deepEqual(
			QUnit.serializeHtml('test\n'),
			[
				{
					NodeType: 3,
					NodeName: '#text',
					NodeValue: 'test'
				}
			]
		);
	});

	test('Equivalent HTML - Elements are equivalent after trimming preceding space(s)', function() {
		QUnit.htmlEqual('  <b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('  <b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - Elements are equivalent after trimming preceding tab(s)', function() {
		QUnit.htmlEqual('\t<b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('\t<b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - Elements are equivalent after trimming preceding newline(s)', function() {
		QUnit.htmlEqual('\n<b>test</b>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('\n<b>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - Elements are equivalent after trimming following space(s)', function() {
		QUnit.htmlEqual('<b>test</b>  ', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b>test</b>  '),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - Elements are equivalent after trimming following tab(s)', function() {
		QUnit.htmlEqual('<b>test</b>\t', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b>test</b>\t'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - Elements are equivalent after trimming following newline(s)', function() {
		QUnit.htmlEqual('<b>test</b>\n', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b>test</b>\n'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - IE element tag name uppercasing', function() {
		QUnit.htmlEqual('<B>test</B>', '<b>test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<B>test</B>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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

	test('Equivalent HTML - IE attribute name uppercasing', function() {
		QUnit.htmlEqual('<b TITLE="testAttr">test</b>', '<b title="testAttr">test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b TITLE="testAttr">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'title',
							NodeValue: 'testAttr'
						}
					],
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

	test('Equivalent HTML - IE attribute optimization drops "unnecessary" quotes', function() {
		QUnit.htmlEqual('<b title=testAttr>test</b>', '<b title="testAttr">test</b>');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b title=testAttr>test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'title',
							NodeValue: 'testAttr'
						}
					],
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

	test('Equivalent HTML - Singleton/empty elements with and without insignificant whitespace', function() {
		QUnit.htmlEqual('<br/>', '<br />');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<br/>'),
			[
				{
					NodeType: 1,
					NodeName: 'br',
					Attributes: [],
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Singleton/empty elements without self-closing slash', function() {
		QUnit.htmlEqual('<br>', '<br />');

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<br>'),
			[
				{
					NodeType: 1,
					NodeName: 'br',
					Attributes: [],
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Possible attribute reordering based on alphabetical order', function() {
		QUnit.htmlEqual(
			'<b class="className" id="guid" lang="en" title="titleText">test</b>',
			'<b id="guid" class="className" title="titleText" lang="en">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b class="className" id="guid" lang="en" title="titleText">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'class',
							NodeValue: 'className'
						},
						{
							NodeType: 2,
							NodeName: 'id',
							NodeValue: 'guid'
						},
						{
							NodeType: 2,
							NodeName: 'lang',
							NodeValue: 'en'
						},
						{
							NodeType: 2,
							NodeName: 'title',
							NodeValue: 'titleText'
						}
					],
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

	test('Equivalent HTML - Possible attribute reordering based on superficial attribute prioritization for `input` elements', function() {
		QUnit.htmlEqual(
			'<input id="guid" type="text" value="blah" size="5" />',
			'<input id="guid" type="text" size="5" value="blah" />'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<input id="guid" type="text" value="blah" size="5" />'),
			[
				{
					NodeType: 1,
					NodeName: 'input',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'id',
							NodeValue: 'guid'
						},
						{
							NodeType: 2,
							NodeName: 'size',
							NodeValue: '5'
						},
						{
							NodeType: 2,
							NodeName: 'type',
							NodeValue: 'text'
						},
						{
							NodeType: 2,
							NodeName: 'value',
							NodeValue: 'blah'
						}
					],
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Possible attribute reordering based on superficial attribute prioritization for `input` elements without self-closing slash', function() {
		// From: http://stackoverflow.com/questions/9227517/firefox-tag-attributes-badly-reordered-after-html-parse
		QUnit.htmlEqual(
			'<input id="guid" type="text" value="blah" size="5">',
			'<input id="guid" type="text" size="5" value="blah">'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<input id="guid" type="text" value="blah" size="5">'),
			[
				{
					NodeType: 1,
					NodeName: 'input',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'id',
							NodeValue: 'guid'
						},
						{
							NodeType: 2,
							NodeName: 'size',
							NodeValue: '5'
						},
						{
							NodeType: 2,
							NodeName: 'type',
							NodeValue: 'text'
						},
						{
							NodeType: 2,
							NodeName: 'value',
							NodeValue: 'blah'
						}
					],
					ChildNodes: []
				}
			]
		);
	});

	test('Equivalent HTML - Normalize `class` attribute with preceding space(s)', function() {
		QUnit.htmlEqual(
			'<b class=" class1">test</b>',
			'<b class="class1">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b class=" class1">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'class',
							NodeValue: 'class1'
						}
					],
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

	test('Equivalent HTML - Normalize `class` attribute with following space(s)', function() {
		QUnit.htmlEqual(
			'<b class="class2 ">test</b>',
			'<b class="class2">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b class="class2 ">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'class',
							NodeValue: 'class2'
						}
					],
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

	test('Equivalent HTML - Normalize `class` attribute with in-between multiple space(s)', function() {
		QUnit.htmlEqual(
			'<b class="class1  class2">test</b>',
			'<b class="class1 class2">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b class="class1  class2">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'class',
							NodeValue: 'class1 class2'
						}
					],
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

	test('Equivalent HTML - Normalize `class` attribute with preceding, in-between, and following whitespace character(s)', function() {
		QUnit.htmlEqual(
			'<b class="\t\n class1 \t\r\n class2 \n\t">test</b>',
			'<b class="class1 class2">test</b>'
		);

		deepEqualIgnoringUnlistedStyleRules(
			QUnit.serializeHtml('<b class="\t\n class1 \t\r\n class2 \n\t">test</b>'),
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'class',
							NodeValue: 'class1 class2'
						}
					],
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

	test('Equivalent HTML - Compares computed styles rather than style attributes - An overridden single rule', function() {
		QUnit.htmlEqual(
			'<b style="font-weight:normal; font-weight:bold;">test</b>',
			'<b style="font-weight:bold;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="font-weight:normal; font-weight:bold;">test</b>');
		// Validate everything but fontWeight
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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
		assertFontWeightIsBold(serializedActual[0]);
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Named colors with casing differences', function() {
		QUnit.htmlEqual(
			'<b style="color:Red;">test</b>',
			'<b style="color:red;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="color:Red;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [ /* Cannot validate `color` this way */ ],
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
		assertStylePropIsColor(serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Hex vs. named colors', function() {
		QUnit.htmlEqual(
			'<b style="color:#FF0000;">test</b>',
			'<b style="color:red;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="color:#FF0000;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [ /* Cannot validate `color` this way */ ],
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
		assertStylePropIsColor(serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Hex colors with casing differences', function() {
		QUnit.htmlEqual(
			'<b style="color:#ff0000;">test</b>',
			'<b style="color:#FF0000;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="color:#ff0000;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [ /* Cannot validate `color` this way */ ],
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
		assertStylePropIsColor(serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Hex colors shorthand vs. normal form', function() {
		QUnit.htmlEqual(
			'<b style="color:#F00;">test</b>',
			'<b style="color:#FF0000;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="color:#F00;">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [ /* Cannot validate `color` this way */ ],
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
		assertStylePropIsColor(serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - RGB vs. hex colors', function() {
		QUnit.htmlEqual(
			'<b style="color:rgb(255, 0, 0);">test</b>',
			'<b style="color:#FF0000;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="color:rgb(255, 0, 0);">test</b>');
		// Validate everything but color
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [ /* Cannot validate `color` this way */ ],
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
		assertStylePropIsColor(serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Rules in different orders', function() {
		QUnit.htmlEqual(
			'<b style="font-weight:bold; color:red;">test</b>',
			'<b style="color:red; font-weight:bold;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="font-weight:bold; color:red;">test</b>');
		// Validate everything but color and fontWeight
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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
		assertFontWeightIsBold(serializedActual[0]);
		// Validate color
		assertStylePropIsColor(serializedActual[0], 'color', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - Shorthand rule vs. individual normal form rules', function() {
		QUnit.htmlEqual(
			'<b style="border:5px solid red;">test</b>',
			'<b style="border-width:5px; border-style:solid; border-color:red;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="border:5px solid red;">test</b>');
		// Validate everything but borderColor
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'style',
							NodeValue: {
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
						}
					],
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
		assertStylePropIsColor(serializedActual[0], 'borderTopColor', 'red');
		assertStylePropIsColor(serializedActual[0], 'borderRightColor', 'red');
		assertStylePropIsColor(serializedActual[0], 'borderBottomColor', 'red');
		assertStylePropIsColor(serializedActual[0], 'borderLeftColor', 'red');
	});

	test('Equivalent HTML - Compares computed styles rather than style attributes - An overridden shorthand rule fully overrides its previous state', function() {
		QUnit.htmlEqual(
			'<b style="background: url(smiley.gif); background: red;">test</b>',
			'<b style="background: red;">test</b>'
		);

		var serializedActual = QUnit.serializeHtml('<b style="background: url(smiley.gif); background: red;">test</b>');
		// Validate everything but backgroundColor and backgroundImage
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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
		assertStylePropIsColor(serializedActual[0], 'backgroundColor', 'red');
		// Validate backgroundImage
		assertBackgroundImageIsNone(serializedActual[0]);
	});

	test('Equivalent HTML - Multiple root elements', function() {
		QUnit.htmlEqual(
			'<b title=strong>test</b><i title=em>ing</i>',
			'<b title="strong">test</b><i title="em">ing</i>'
		);

		var serializedActual = QUnit.serializeHtml('<b title=strong>test</b><i title=em>ing</i>');
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'title',
							NodeValue: 'strong'
						}
					],
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
					Attributes: [
						{
							NodeType: 2,
							NodeName: 'title',
							NodeValue: 'em'
						}
					],
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

	test('Equivalent HTML - Multiple root nodes', function() {
		QUnit.htmlEqual(
			'<B>test</B>ing<I>!</I>',
			'<b>test</b>ing<i>!</i>'
		);

		var serializedActual = QUnit.serializeHtml('<B>test</B>ing<I>!</I>');
		deepEqualIgnoringUnlistedStyleRules(
			serializedActual,
			[
				{
					NodeType: 1,
					NodeName: 'b',
					Attributes: [],
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
					Attributes: [],
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

	test('Inequivalent HTML', function() {
		QUnit.notHtmlEqual(
			'test fail',
			'TEST FAIL',
			'Text node value casing differences cause inequality'
		);

		QUnit.notHtmlEqual(
			'test fail',
			'<b>test fail</b>',
			'Different DOM structure causes inequality'
		);

		QUnit.notHtmlEqual(
			'<b>test fail</b>',
			'<i>test fail</i>',
			'Same DOM structure but different elements causes inequality'
		);

		QUnit.notHtmlEqual(
			'<b>test fail</b>',
			'<b>test <i>fail</i></b>',
			'Extra internal element wrappers cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b title="TEST">test</b>',
			'<b title="test">test</b>',
			'Attribute value casing differences cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b id="actual">test fail</b>',
			'<b id="expected">test fail</b>',
			'Attribute value differences cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b class="class1 class2">test fail</b>',
			'<b class="class2 class1">test fail</b>',
			'CSS class name ordering differences cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b style="color:red;">test</b>',
			'<b style="color:green;">test</b>',
			'Computed style differences for a single rule cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b style="font-weight:100; font-weight:900;">test</b>',
			'<b style="font-weight:100;">test</b>',
			'Computed style differences for an overridden single rule cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b style="font-weight:bold; color:red;">test</b>',
			'<b style="font-weight:bold;">test</b>',
			'Computed style differences over all rules cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b>test</b>',
			'<b>test</b><b>ing</b>',
			'Different number of nodes (and different overall text content) cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b>testing</b>',
			'<b>test</b><b>ing</b>',
			'Different number of nodes (but same overall text content) cause inequality'
		);

		QUnit.notHtmlEqual(
			'<b>testing</b>',
			'<b>test</b>ing',
			'Different number of nodes (and node types) cause inequality'
		);
	});

})();