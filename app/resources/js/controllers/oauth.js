angular.module('Controller:OAuth', [
// Dependencies
    'OAuthFB',
    'OAuthGoogle',
])
.controller('Controller:OAuth', function(
// Dependency Injections
    $scope,
    $window,
    OAuthFB,
    OAuthGoogle
){

    window.googleAppID = {};
    window.googleAppID.clientId = "555054377171-n8geoctm8268uummgi35cb86uon8nusk.apps.googleusercontent.com";
    window.googleAppID.apiKey = "tUn5s9AkUNx3LICuWMgP4ka3";
    window.googleAppID.scopes = "email";

    // OAuth
    $scope.oauth = {};
    // $scope.oauth.fb = new OAuthFB(window.promptlyConfig.fbAppID);
    $scope.oauth.google = new OAuthGoogle(window.googleAppID);

    // Dev
    $window.logScope2 = function () {
        $window.$scope = $scope;
        console.log($scope);
    };
});