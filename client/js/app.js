angular
  .module('app', [
    'lbServices',
    'ui.router'
  ])
  .filter('voltageLevel', function() {
    return function(input) {
      if (input == null) {
        return input;
      }

      return input + "V";
    }
  })
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
