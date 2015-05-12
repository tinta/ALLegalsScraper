angular
.module('OAuthFB', [
    // Dependencies
])
.factory('OAuthFB', function(
    // Dependency Providers
    $rootScope
){
    var oauth = (function(){
        var oauth = function (appId) {
            this.appId = appId;
            this.isLoggedIn = false;

            // `FB` is global exposed by script: "//connect.facebook.net/en_US/sdk.js"
            FB.init({
                appId      : appId,
                cookie     : true,  // enable cookies to allow the server to access the session
                xfbml      : false,  // parse social plugins on this page
                version    : 'v2.1' // use version 2.1
            });

            FB.getLoginStatus(function(res) {
                this.statusChangeCallback(res);
            }.bind(this));
        };

        oauth.prototype.statusChangeCallback = function (response) {
            if (response.status === 'connected') {
                this.isLoggedIn = true;
                // Logged into app and Facebook.
                this.getUserInfo();
            } else if (response.status === 'not_authorized') {
                // The person is logged into Facebook, but not app.
                this.isLoggedIn = false;
                $rootScope.$broadcast('oauthfb:disconnected', response);
            } else {
                // The person is not logged into Facebook, so we're not sure if they are logged into app or not.
                this.isLoggedIn = false;
                $rootScope.$broadcast('oauthfb:disconnected', response);
            }
        };

        oauth.prototype.checkLoginState = function () {
            FB.getLoginStatus(function(res) {
                this.statusChangeCallback(res);
            }.bind(this));
        };

        oauth.prototype.getUserInfo = function () {
            FB.api('/me', function(res) {
                $rootScope.$broadcast('oauthfb:connected', res);
            });
        };

        oauth.prototype.login = function () {
            var options = {
                scope: 'public_profile'
            };

            FB.login(function(res) {
                this.statusChangeCallback(res);
            }.bind(this), options);
        };

        oauth.prototype.logout = function () {
            FB.logout(function(res) {
                this.statusChangeCallback(res);
            }.bind(this));
        };

        return oauth;
    })();

    return oauth;
});