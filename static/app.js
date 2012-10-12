$(function(){

	String.prototype.linkify = function() {
		return this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/, function(m) {
			return m.link(m);
		});
	};

	function relative_time(time_value) {
		var values = time_value.split(" ");
		// time_value = values[2] + " " + values[1] + ", " + values[3] + " " + values[5];
		var parsed_date = Date.parse(time_value);
		var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
		var delta = parseInt((relative_to.getTime() - parsed_date) / 1000);
		delta = delta + (relative_to.getTimezoneOffset() * 60);

		var r = '';
		if (delta < 60) {
			r = 'a minute ago';
		} else if(delta < 120) {
			r = 'couple of minutes ago';
		} else if(delta < (45*60)) {
			r = (parseInt(delta / 60)).toString() + ' minutes ago';
		} else if(delta < (90*60)) {
			r = 'an hour ago';
		} else if(delta < (24*60*60)) {
			r = '' + (parseInt(delta / 3600)).toString() + ' hours ago';
		} else if(delta < (48*60*60)) {
			r = '1 day ago';
		} else {
			r = (parseInt(delta / 86400)).toString() + ' days ago';
		}

		return r;
	}

	var app = {
		mainController: null,
		models: {},
		collections: {},
		views: {}
	};

	// Search Module
	//------------------
	app.models.SearchModel = Backbone.Model.extend({
		initialize: function() {
			var type = '';
			if (this.get('isFB') === true) {
				type = type + ' f ';
			}
			if (this.get('isTwitter') === true) {
				type = type + ' t ';
			}
			this.set('type', type);
		}
	});

	app.collections.SearchCollection = Backbone.Collection.extend({
		model: app.models.SearchModel,
		initialize: function() {
		}
	});
	app.views.SearchView = Backbone.View.extend({
		tagName: 'li',
		className: 'search-item',
		events: {
			'click .item': 'research'
		},
		initialize: function() {
			this.render();
		},
		render: function() {
			this.template = _.template($('#search-item-view').html());
            var dict = this.model.toJSON();
            var markup = this.template(dict);
            $(this.el).html(markup);
            return this;
		},

		research: function() {
			application.search(this.model.get('query'), this.model.get('isFB'), this.model.get('isTwitter'));
		}
	});

	app.views.SearchHistoryView = Backbone.View.extend({
		events: {
		},
		initialize: function () {
			this._searchViews = [];
			this.searchList = this.options.searchList;

			//set event handlers
			_.bindAll(this, 'onSearchAdd');
			this.searchList.bind('add', this.onSearchAdd);
		},

		load: function () {
		},

		onSearchAdd: function(model) {
			console.log('search item added', model.get('query'));
			var searchController = new app.views.SearchView({
				model: model
			});

			//display tweet item
			this._searchViews.push(searchController);
			this.$('.search-list').append(searchController.render().el);
		}
	});

	// Facebook MVC
	//-----------------
	app.models.FBFeedModel = Backbone.Model.extend({
		initialize: function() {

			if (this.get('message') !== undefined) {
				this.set('text', this.get('message'));
			} else if (this.get('description') !== undefined) {
				this.set('text', this.get('description'));
			} else if (this.get('caption') !== undefined) {
				this.set('text', this.get('caption'));
			} else if (this.get('story') !== undefined) {
				this.set('text', this.get('story'));
			} else if (this.get('name') !== undefined) {
				this.set('text', this.get('name'));
			}
		}
	});

	app.collections.FBFeedCollection = Backbone.Collection.extend({
        model: app.models.FBFeedModel,
        initialize: function() {

        },
        url: function() {
			return 'http://search.twitter.com/search.json?q=' + this.query +  '&rpp=1000' + '&callback=?';
        },
        query: '', //default query
        page: '1',
        parse: function(resp, xhr) {
			return resp.results;
        }

    });

	app.views.FBFeedController = Backbone.View.extend({
		tagName: 'li',
		events: {
		},
		initialize: function() {
			this.render();
		},
		render: function() {
			this.template = _.template($('#fb-feed-view').html());
            var dict = this.model.toJSON();
            var markup = this.template(dict);
            $(this.el).html(markup);
            return this;
		}
	});
	// Twitter MVC
	//-----------------
	app.models.TweetModel = Backbone.Model.extend({
		initialize: function() {
			var txt = this.get('text');
			this.set('text', txt.linkify());
			this.set('relative_time', relative_time(this.get('created_at')));
		}
	});

	app.collections.TweetCollection = Backbone.Collection.extend({
        model: app.models.TweetModel,
        initialize: function() {

        },
        url: function() {
			return 'http://search.twitter.com/search.json?q=' + this.query +  '&rpp=1000' + '&callback=?';
        },
        query: '', //default query
        page: '1',
        parse: function(resp, xhr) {
			return resp.results;
        }

    });

	app.views.TweetController = Backbone.View.extend({
		tagName: 'li',
		events: {
			"click .tweet-reply": "onReply",
			"click .tweet-retweet": "onRetweet",
			"click .tweet-favorite": "onFavorite"
		},
		initialize: function() {
			this.render();
		},
		render: function() {
			this.template = _.template($('#tweet-view-new').html());
            var dict = this.model.toJSON();
            var markup = this.template(dict);
            $(this.el).html(markup);
            return this;
		},
		onReply: function() {
			var url = "https://twitter.com/intent/tweet?in_reply_to=" + this.model.get('id');
			window.open(url, "_newtab");
		},
		onRetweet: function() {
			var url = "https://twitter.com/intent/retweet?tweet_id=" + this.model.get('id');
			window.open(url, "_newtab");
		},
		onFavorite: function() {
			var url = "https://twitter.com/intent/favorite?tweet_id=" + this.Model.get('id');
			window.open(url, "_newtab");
		}

	});

	// Main App
	//------------
	app.mainController = Backbone.View.extend({
		events: {
			'submit .tweet-search': 'onSearch',
			'click #fb-login': 'onFBLogin',
			'click #fb-logout': 'onFBLogout'
		},
		initialize: function () {
			this._tweetsView = [];
			this.tweets = new app.collections.TweetCollection();
			this.fbFeeds = new app.collections.FBFeedCollection();
			this.searchList = new app.collections.SearchCollection();

			new app.views.SearchHistoryView({
				el: $('.sidebar-history'),
				searchList: this.searchList
			});

			//set event handlers
			_.bindAll(this, 'onTweetAdd');
			this.tweets.bind('add', this.onTweetAdd);

			_.bindAll(this, 'onFBFeedAdd');
			this.fbFeeds.bind('add', this.onFBFeedAdd);
		},

		loadTweets: function () {
			var that = this;
			this.tweets.reset();

			this.tweets.fetch({
				add: that.onTweetAdd,
				success: function() {
				}
			});
		},

		incResultCount: function() {
			var searchCount = parseInt($('.search-count').text(), 10);
			$('.search-count').text(searchCount + 1);
		},
		loadFbFeeds: function() {
			var that = this;
			var query = this.fbFeeds.query;
			this.fbFeeds.reset();
			FB.api('/me/home?q=' + query, function(res){
				console.log(res);
				that.fbFeeds.add(res.data);
			});
		},
		onFBLogin: function() {
			fbUser.login();
		},
		onFBLogout: function() {
			fbUser.logout();
		},
		search: function(query, isFB, isTwitter) {

			$('.title').html('<span class="blue search-count">0</span> results for: "' + query +'"');
			this.tweets.query = query;
			this.fbFeeds.query = query;
			this.$('.tweets-result li').remove();

			//check if new search
			var newSearch = true;
			this.searchList.each(function(search) {
				if (search.get('query') === query) {
					if (search.get('isFB') === isFB && search.get('isTwitter') === isTwitter) {
						newSearch = false;
					}
				}
			});

			//if not add to search history
			if (newSearch) {
				this.searchList.add({
					query: query,
					isFB: isFB,
					isTwitter: isTwitter
				});
			}

			if (isFB) {
				this.loadFbFeeds();
			}

			if (isTwitter) {
				this.loadTweets();
			}
		},

		onSearch: function() {
			var isFB = false;
			var isTwitter = false;

			//check if Facebook checkbox is checked
			if ($('input[name="cb-facebook"]:checked').length > 0 ) {
				isFB = true;
			}

			//check if Twitter checkbox is checked
			if ($('input[name="cb-twitter"]:checked').length > 0 ) {
				isTwitter = true;
			}
			//check if new search
			var query = this.$('.search-query').val();
			this.search(query, isFB, isTwitter);
			return false;
		},

		onTweetAdd: function(model) {
			this.incResultCount();
			console.log('tweet added', model.get('text'));
			var tweetController = new app.views.TweetController({
				model: model
			});

			//display tweet item
			this._tweetsView.push(tweetController);
			this.$('.tweets-result').append(tweetController.render().el);
		},
		onFBFeedAdd: function(model) {
			this.incResultCount();
			var fbfeedController = new app.views.FBFeedController({
				model: model
			});

			//display tweet item
			this.$('.tweets-result').append(fbfeedController.render().el);
		}

	});

	window.application = new app.mainController({
		el: $('body')
	});


});