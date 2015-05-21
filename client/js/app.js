angular
  .module('app', [
    'lbServices',
    'ui.router'
  ])
  .config(['$stateProvider', '$urlRouterProvider', function($stateProvider,
      $urlRouterProvider) {
    $stateProvider
      .state('status', {
        url: '',
        templateUrl: 'views/status.html',
        controller: 'StatusController'
      });

    $urlRouterProvider.otherwise('status');
  }]);
