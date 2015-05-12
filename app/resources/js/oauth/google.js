angular
.module('OAuthGoogle', [
    // Dependencies
])
.factory('OAuthGoogle', function(
    $rootScope,
    $http
){
    var oauth = (function(){
        var oauth = function (keys) {
            this.keys = keys;
            this.loading = true;
            this.user = undefined; // Declared in auth.onApiSuccess

            this.init();
        };

        oauth.prototype.init = function () {
            // Step 1: Reference the API key
            if (gapi && gapi.client) {
                gapi.client.setApiKey(this.keys.apiKey);
                window.setTimeout(this.checkAuth.bind(this), 1);
            } else {
                window.setTimeout(this.init.bind(this), 100);
            }

            return this;
        };

        oauth.prototype.checkAuth = function () {
            var This = this;

            var authObj = {
                client_id: This.keys.clientId,
                scope: This.keys.scopes,
                immediate: true
            };
            gapi.auth.authorize(authObj, this.handleAuthResult.bind(this));
        };

        oauth.prototype.handleAuthResult = function (authResult) {
            this.loading = false;

            if (authResult && !authResult.error) {
                this.loading = true;
                this.makeApiCall();
            } else {
                $rootScope.$broadcast("oauthgoogle:unauthorized", authResult);
            }
        };

        oauth.prototype.handleAuthClick = function() {
            console.log('asdf')
            var This = this;
            var authObj = {
                client_id: This.keys.clientId,
                scope: This.keys.scopes,
                immediate: false
            };
            // Step 2: get authorization to use private data
            gapi.auth.authorize(authObj, this.handleAuthResult.bind(this));
            return false;
        };

        oauth.prototype.makeApiCall = function() {
            // Step 3: Load the Google+ API
            console.log(1)
            gapi.client.load('plus', 'v1').then(function() {
                console.log(2)
                // Step 4: Assemble the API request
                console.log('asdfd')
                var request = gapi.client.plus.people.get({
                    'userId': 'me'
                });
                // Step 5: Execute the API request
                request.execute(this.onApiSuccess.bind(this));
            }.bind(this), function(err) {
                console.log(err)
            });
        };

        oauth.prototype.onApiSuccess = function (res) {
            this.loading = false;
            res.emails.forEach(function(email) {
                var domainStart = email.value.indexOf('@') + 1;
                var domainEnd = email.value.length;
                var emailDomain = email.value.slice(domainStart, domainEnd);
                var expectedDomain = 'prompt.ly';
                if (emailDomain === expectedDomain) {
                    this.user = res;
                    $rootScope.$broadcast("oauthgoogle:authorized", res);
                }
            }.bind(this));
        };

        oauth.prototype.revokeAccess = function () {
            var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' + gapi.auth.getToken().access_token;

            $http.get(revokeUrl).success(function(nullResponse) {
                this.user = undefined;
            }.bind(this)).error(function(error) {
                this.user = undefined;
            }.bind(this));
        };

        return oauth;
    })();

    return oauth;
});