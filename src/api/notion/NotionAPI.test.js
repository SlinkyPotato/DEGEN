"use strict";

const chai = require('chai');
const assert = chai.assert;
const notionAPI = require( "./NotionAPI.js");

describe( "NotionAPI", () => {
  before( () => {
      console.log("initiating tests on notion APIs");
  } );

  after( () => {
    console.log( "finished testing notion APIs" );
  } );

  describe("Headers validation", () => {
    it( "should return 2021-05-13 when getting notion version", () => {
        assert.strictEqual(notionAPI.defaults.headers['Notion-Version'], '2021-05-13' );
    } );

    it( "should not be empty when getting token", () => {
        assert.typeOf(notionAPI.defaults.headers.Authorization, 'string');
    } );
  } );
} );