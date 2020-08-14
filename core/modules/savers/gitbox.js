/*\
title: $:/core/modules/savers/gitbox.js
type: application/javascript
module-type: saver
Saves wiki by pushing a commit to the gitbox
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Select the appropriate saver module and set it up
*/
var GitboxSaver = function(wiki) {
	this.wiki = wiki;
};

GitboxSaver.prototype.save = function(text,method,callback) {
	var self = this,
		username = this.wiki.getTiddlerText("$:/gitbox/Username"),
		password = $tw.utils.getPassword("gitbox"),
		repo = this.wiki.getTiddlerText("$:/gitbox/Repo"),
		path = this.wiki.getTiddlerText("$:/gitbox/Path",""),
		filename = "index.tmp",
		branch = "master",
		endpoint = this.wiki.getTiddlerText("$:/gitbox/ServerURL") || "https://gitbox.org",
		headers = {
			"Accept": "application/json",
			"Content-Type": "application/json;charset=UTF-8",
			"Authorization": "Basic " + window.btoa(username + ":" + password)
		};
	// Bail if we don't have everything we need
	if(!username || !password || !repo || !path || !filename) {
		return false;
	}
	// Make sure the path start and ends with a slash
	if(path.substring(0,1) !== "/") {
		path = "/" + path;
	}
	if(path.substring(path.length - 1) !== "/") {
		path = path + "/";
	}
	// Compose the base URI
	var uri = endpoint + "/repos/" + repo + "/contents" + path;
	// Perform a get request to get the details (inc shas) of files in the same path as our file
	$tw.utils.httpRequest({
		url: uri,
		type: "GET",
		headers: headers,
		data: {
			ref: branch
		},
		callback: function(err,getResponseDataJson,xhr) {
			var getResponseData,sha = "";
			if(err && xhr.status !== 404) {
				return callback(err);
			}
			var use_put = true;
			if(xhr.status !== 404) {
				getResponseData = JSON.parse(getResponseDataJson);
				$tw.utils.each(getResponseData,function(details) {
					if(details.name === filename) {
						sha = details.sha;
					}
				});
				if(sha === ""){
					use_put = false;
				}
			}
			var data = {
				message: $tw.language.getRawString("ControlPanel/Saving/GitService/CommitMessage"),
				content: $tw.utils.base64Encode(text),
				sha: sha
			};
			$tw.utils.httpRequest({
				url: endpoint + "/repos/" + repo + "/branches/" + branch,
				type: "GET",
				headers: headers,
				callback: function(err,getResponseDataJson,xhr) {
					if(xhr.status === 404) {
						callback("Please ensure the branch in the gitbox repo exists");
					}else{
						data["branch"] = branch;
						self.upload(uri + filename, use_put?"PUT":"POST", headers, data, callback);
					}
				}
			});
		}
	});
	return true;
};

GitboxSaver.prototype.upload = function(uri,method,headers,data,callback) {
	$tw.utils.httpRequest({
		url: uri,
		type: method,
		headers: headers,
		data: JSON.stringify(data),
		callback: function(err,putResponseDataJson,xhr) {
			if(err) {
				return callback(err);
			}
			var putResponseData = JSON.parse(putResponseDataJson);
			callback(null);
		}
	});
};

/*
Information about this saver
*/
GitboxSaver.prototype.info = {
	name: "gitbox",
	priority: 2000,
	capabilities: ["save", "autosave"]
};

/*
Static method that returns true if this saver is capable of working
*/
exports.canSave = function(wiki) {
	return true;
};

/*
Create an instance of this saver
*/
exports.create = function(wiki) {
	return new GitboxSaver(wiki);
};

})();
