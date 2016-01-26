/*
	Copyright (c) 2015-2016, Loic Blot <loic.blot@unix-experience.fr>
	All rights reserved.
	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are met:

	* Redistributions of source code must retain the above copyright
	  notice, this list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright
	  notice, this list of conditions and the following disclaimer in the
	  documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS'' AND ANY
	EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	DISCLAIMED. IN NO EVENT SHALL THE REGENTS AND CONTRIBUTORS BE LIABLE FOR ANY
	DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

function gafidx(obj, idx) {
	return obj[idx] !== undefined ? obj[idx] : [];
}

var app = angular.module('searchApp', ['infinite-scroll'])

searchControllerScope = undefined;

app.controller('searchController', ['$scope','$http','$location',
	function($scope, $http, $location) {
		searchControllerScope = $scope;
		$scope.results = [];
		$scope.exactResults = [];
		$scope.interestingResults = [];
		$scope.searchState = 0;
		$scope.location = $location.search();
		$scope.searchWhat = $scope.location.q;
		$scope.oldSearchWhat = $scope.location.q;
		$scope.searchErrorCode = 0;
		$scope.searchPage = 1;
		$scope.loadedSearchPage = 1;

		$scope.search = function() {
			$scope.searchState = 1;
			// If we do another research, tell the buffer we do a new research & reset page count
			// & reset results
			if ($scope.oldSearchWhat != $scope.searchWhat) {
				$scope.oldSearchWhat = $scope.searchWhat;
				$scope.loadedSearchPage = 1;
				$scope.searchPage = 1;
				$scope.results = [];
			}

			var res = $http.post("/search", {"s": $scope.searchWhat, "p": $scope.searchPage});
			res.success(function(data, status, headers, config) {
				$scope.searchState = 2;
				// If no results (new search) affect array
				if ($scope.results.length == 0) {
					$scope.results = gafidx(data, "remote_engine");
				}
				// Else concat
				else {
					$scope.results += gafidx(data, "remote_engine");
				}
				$scope.exactResults = gafidx(data, "exact");
				$scope.loadedSearchPage = $scope.searchPage;
			});
			res.error(function(data, status, headers, config) {
				$scope.searchState = 3;
				$scope.searchErrorCode = status;
				$scope.loadedSearchPage = $scope.searchPage;
			});
		};

		$scope.loadMoreResults = function () {
			// If nothing to search or not results, do nothing
			if ($scope.searchWhat === undefined || $scope.searchWhat.length == 0 ||
				$scope.results.length == 0) {
				return;
			}

			// If loaded page is last requested page, increment and request new
			if ($scope.loadedSearchPage == $scope.searchPage) {
				$scope.searchPage += 1;
				alert($scope.searchPage);
				$scope.search()
				// And now search
			}
		};

		$scope.markAsInteresting = function(r) {
			var res = $http.post("/interest", {
				"url": r.link,
				"content": r.body,
				"terms_searched": $scope.searchWhat,
				"title": r.title
			});

			res.success(function(data, status, headers, config) {
			});
			res.error(function(data, status, headers, config) {
			});
		};

	    	$scope.$on('$locationChangeSuccess', function (event) {
			$scope.location = $location.search();
			$scope.searchWhat = $scope.location.q;
			if ($scope.searchWhat !== undefined) {
				eval($scope.search());
			}
		});
	}
]);
