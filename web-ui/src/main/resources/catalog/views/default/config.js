/*
 * Copyright (C) 2001-2016 Food and Agriculture Organization of the
 * United Nations (FAO-UN), United Nations World Food Programme (WFP)
 * and United Nations Environment Programme (UNEP)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301, USA
 *
 * Contact: Jeroen Ticheler - FAO - Viale delle Terme di Caracalla 2,
 * Rome - Italy. email: geonetwork@osgeo.org
 */

(function() {

  goog.provide('gn_search_default_config');

  var module = angular.module('gn_search_default_config', []);

  module.value('gnTplResultlistLinksbtn',
    '../../catalog/views/default/directives/partials/linksbtn.html');

  module
    .run([
      'gnSearchSettings',
      'gnViewerSettings',
      'gnOwsContextService',
      'gnMap',
      'gnNcWms',
      'gnConfig',
      '$rootScope',
      function(searchSettings, viewerSettings, gnOwsContextService,
               gnMap, gnNcWms, gnConfig, $rootScope) {
        // Load the context defined in the configuration
        viewerSettings.defaultContext =
          viewerSettings.mapConfig.viewerMap ||
          '../../map/config-viewer.xml';

        // Keep one layer in the background
        // while the context is not yet loaded.
        viewerSettings.bgLayers = [
          gnMap.createLayerForType('osm')
        ];

        viewerSettings.servicesUrl =
          viewerSettings.mapConfig.listOfServices || {};

        // WMS settings
        // If 3D mode is activated, single tile WMS mode is
        // not supported by ol3cesium, so force tiling.
        if (gnConfig['map.is3DModeAllowed']) {
          viewerSettings.singleTileWMS = false;
          // Configure Cesium to use a proxy. This is required when
          // WMS does not have CORS headers. BTW, proxy will slow
          // down rendering.
          viewerSettings.cesiumProxy = true;
        } else {
          viewerSettings.singleTileWMS = true;
        }

        var bboxStyle = new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'rgba(255,0,0,1)',
            width: 2
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255,0,0,0.3)'
          })
        });
        searchSettings.olStyles = {
          drawBbox: bboxStyle,
          mdExtent: new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'orange',
              width: 2
            })
          }),
          mdExtentHighlight: new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'orange',
              width: 3
            }),
            fill: new ol.style.Fill({
              color: 'rgba(255,255,0,0.3)'
            })
          })

        };

        // Display related links in grid ?
        searchSettings.gridRelated = ['parent', 'children',
          'services', 'datasets'];

        // Object to store the current Map context
        viewerSettings.storage = 'sessionStorage';

        /******************************************************************* Define maps
         */
        // Define British National Grid Proj4js projection (copied from http://epsg.io/27700.js)
        proj4.defs("EPSG:27700","+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");

        // Default projection
        var defaultProjection = "EPSG:27700";

        // Define extents/resolutions/etc. for each projection
        var extent27700 = [-682855, 466783, 1222145, 1275783];
        var resolutions27700 = [1600,800,400,200,100,50,25,10,5,2.5,1,0.5,0.25,0.125,0.0625];
        var center27700 = [269645, 871283];

        var extent3857 = ol.proj.transformExtent(extent27700,'EPSG:27700','EPSG:3857');
        var center3857 = ol.proj.transform(center27700,'EPSG:27700','EPSG:3857');

        // Define an OL3 projection based on the included Proj4js projection
        // definition and set it's extent.
        var bng = ol.proj.get('EPSG:27700');
        bng.setExtent(extent27700);
        //need this for graticule to work
        var wrldExtent = ol.proj.transformExtent([0,0,700000,1300000],'EPSG:27700','EPSG:4326');
        bng.setWorldExtent(wrldExtent);


        // Define a TileGrid to ensure that WMS requests are made for
        // tiles at the correct resolutions and tile boundaries
        var tileGrid = new ol.tilegrid.TileGrid({
          origin: extent27700.slice(0, 2),
          resolutions: resolutions27700
        });


        // EPSG:3857 background layers
        var oLayer3857ADSPremium = new ol.layer.Tile({
          title: 'ADS OS Premium Mercator',
          visible: true,
          source: new ol.source.XYZ({
            url: "http://t0.ads.astuntechnology.com/spatialdata-gov-scot/ospremium/tiles/ospremiumwebmerc_EPSG3857/{z}/{x}/{y}.png"
          })
        });
        oLayer3857ADSPremium.displayInLayerManager = false;
        oLayer3857ADSPremium.background = true;
        oLayer3857ADSPremium.hidden = false;
        oLayer3857ADSPremium.set('group', 'Background layers');

        var oLayer3857ADSPremiumGrey = new ol.layer.Tile({
          title: 'ADS OS Premium Greyscale Mercator',
          visible: false,
          source: new ol.source.XYZ({
            url: "http://t0.ads.astuntechnology.com/spatialdata-gov-scot/ospremium/tiles/ospremiumbwwebmerc_EPSG3857/{z}/{x}/{y}.png"
          })
        });
        oLayer3857ADSPremiumGrey.displayInLayerManager = false;
        oLayer3857ADSPremiumGrey.background = true;
        oLayer3857ADSPremiumGrey.hidden = true;
        oLayer3857ADSPremiumGrey.set('group', 'Background layers');

        // EPSG:27700 background layers
        var oLayer27700ADSPremium = new ol.layer.Tile({
          title: 'ADS OS Premium',
          visible: true,
          source: new ol.source.TileWMS({
            url: 'http://t0.ads.astuntechnology.com/spatialdata-gov-scot/ospremium/service?',
            attributions: [
              new ol.Attribution({html: 'Astun Data Service &copy; Ordnance Survey.'})
            ],
            params: {
              'LAYERS': 'ospremium',
              'FORMAT': 'image/png',
              'QUERY_LAYERS': 'ospremium'
            },
            tileGrid: tileGrid
          })
        });
        oLayer27700ADSPremium.displayInLayerManager = false;
        oLayer27700ADSPremium.background = true;
        oLayer27700ADSPremium.hidden = false;
        oLayer27700ADSPremium.set('group', 'Background layers');


        var oLayer27700ADSPremiumGrey = new ol.layer.Tile({
          title: 'ADS OS Premium (Greyscale)',
          visible: false,
          source: new ol.source.TileWMS({
            url: 'http://t0.ads.astuntechnology.com/spatialdata-gov-scot/ospremium/service?',
            attributions: [
              new ol.Attribution({html: 'Astun Data Service &copy; Ordnance Survey.'})
            ],
            params: {
              'LAYERS': 'ospremiumbw',
              'FORMAT': 'image/png',
              'QUERY_LAYERS': 'ospremiumbw'
            },
            tileGrid: tileGrid
          })
        });
        oLayer27700ADSPremiumGrey.displayInLayerManager = false;
        oLayer27700ADSPremiumGrey.background = true;
        oLayer27700ADSPremiumGrey.hidden = true;
        oLayer27700ADSPremiumGrey.set('group', 'Background layers');


        var projectionConfig = {
          "EPSG:3857": {
            "layers" : [oLayer3857ADSPremium, oLayer3857ADSPremiumGrey],
            "extent":  extent3857,
            "center": center3857,
            "zoom": 7
          },
          "EPSG:27700": {
            "layers": [oLayer27700ADSPremium, oLayer27700ADSPremiumGrey],
            "extent": extent27700,
            "resolutions": resolutions27700,
            "center": center27700,
            "zoom": 1
          }
        };

        //important to set the projection info here (also), used as view configuration
        var mapsConfig = {
          extent: projectionConfig[defaultProjection].extent,
          projection: ol.proj.get(defaultProjection),
          zoom: projectionConfig[defaultProjection].zoom
        };

        if (projectionConfig[defaultProjection].resolutions) {
          angular.extend(mapsConfig, {resolutions: projectionConfig[defaultProjection].resolutions})
        }

        if (projectionConfig[defaultProjection].center) {
          angular.extend(mapsConfig, { center: projectionConfig[defaultProjection].center})
        }

        // Add backgrounds to TOC
        viewerSettings.bgLayers = projectionConfig[defaultProjection].layers; //tileLayers;
        viewerSettings.servicesUrl = {};

        //Configure the ViewerMap
        var viewerMap = new ol.Map({
          controls:[],
          layers: [],
          view: new ol.View(mapsConfig) //new ol.View(mapsConfig)
        });

        //configure the SearchMap
        var searchMap = new ol.Map({
          controls:[],
          layers: viewerMap.getLayers(),
          view: new ol.View(mapsConfig) //new ol.View(mapsConfig)
        });

        function checkForProjection() {
          if (jQuery('#projection').length === 0) {
            window.setTimeout(checkForProjection, 500);
            return;
          }


          ol.control.Projection = function(opt_options) {
            var options = opt_options || {};
            var _this = this;
            var projSwitcher = document.createElement('select');
            var webMercator = document.createElement('option');
            webMercator.value = 'EPSG:3857';
            webMercator.textContent = 'Web Mercator';

            projSwitcher.appendChild(webMercator);
            //var plateCarree = document.createElement('option');
            //plateCarree.value = 'EPSG:4326';
            //plateCarree.textContent = 'Plate Carree (Lat/Lon)';

            //projSwitcher.appendChild(plateCarree);
            projSwitcher.addEventListener('change', function(evt) {
              var view = _this.getMap().getView();

              var oldProj = view.getProjection();
              var newProj = ol.proj .get(this.value);

              var nExtent = ol.proj.transformExtent(
                view.calculateExtent(_this.getMap().getSize()),
                oldProj,
                newProj
              );

              // Adapt zoom level
              var currentZoomLevel = _this.getMap().getView().getZoom();
              var newZoomLevel;
              if (this.value == 'EPSG:27700') {
                newZoomLevel = Math.max(1, currentZoomLevel - 6);
              } else {
                newZoomLevel= currentZoomLevel + 6;
              }

              console.log(newZoomLevel);

              var mapsConfig = {
                extent: projectionConfig[this.value].extent,
                projection: newProj,
                center: ol.proj.transform(_this.getMap().getView().getCenter(), oldProj, newProj),
                zoom:  newZoomLevel //projectionConfig[this.value].zoom //_this.getMap().getView().getZoom()
              };

              if (projectionConfig[this.value].resolutions) {
                angular.extend(mapsConfig, {resolutions: projectionConfig[this.value].resolutions})
              }

              //if (projectionConfig[newProj].center) {
              //  angular.extend(mapsConfig, { center: projectionConfig[newProj].center,})
              //}


              var newView = new ol.View(mapsConfig);

              // Set the view
              _this.getMap().setView(newView);

              //_this.getMap().getView().fit(nExtent,
              //_this.getMap().getSize());

              var layersToRemove = [];

              _this.getMap().getLayers().forEach(function(layer) {
                if (layer.get("group") == 'Background layers') {
                  layersToRemove.push(layer);

                }
              });
              for (var i = 0; i < layersToRemove.length; i++) {
                _this.getMap().removeLayer(layersToRemove[i]);
              }

              viewerSettings.bgLayers = projectionConfig[this.value].layers; //tileLayers;

              for (i = 0; i < viewerSettings.bgLayers.length; i++) {
                if (!viewerSettings.bgLayers[i].hidden) {
                  _this.getMap().getLayers().insertAt(0,  viewerSettings.bgLayers[i]);
                }
              }

              $rootScope.$broadcast('bgLayers-update');


              _this
                .getMap()
                .getLayers()
                .forEach(
                  function(layer) {
                    _this
                      .changeLayerProjection(
                        layer,
                        oldProj,
                        newProj);
                  });

                  _this.getMap().getControls()
                    .forEach(function(control) {
                      if (typeof control.setProjection === "function") {
                        control.setProjection(newProj);
                      }
                    });

                });
            ol.control.Control.call(this, {
              element : projSwitcher,
              target : options.target
            });
            this.set('element', projSwitcher);
          };
          ol.inherits(ol.control.Projection, ol.control.Control);

          ol.control.Projection.prototype.setMap = function(map) {
            ol.control.Control.prototype.setMap.call(this, map);
            if (map !== null) {
              this.get('element').value = map.getView()
                .getProjection().getCode();
            }
          };

          ol.control.Projection.prototype.changeLayerProjection = function(
            layer, oldProj, newProj) {
            if (layer instanceof ol.layer.Group) {
              layer.getLayers()
                .forEach(
                  function(subLayer) {
                    this.changeLayerProjection(
                      subLayer, oldProj,
                      newProj);
                  });
            } else if (layer instanceof ol.layer.Tile) {
              var tileLoadFunc = layer.getSource()
                .getTileLoadFunction();
              layer.getSource().setTileLoadFunction(
                tileLoadFunc);
            } else if (layer instanceof ol.layer.Vector) {
              var features = layer.getSource().getFeatures();
              for (var i = 0; i < features.length; i += 1) {
                features[i].getGeometry().transform(
                  oldProj, newProj);
              }
            }
          };

          ol.control.Projection.prototype.addProjection = function(
            projection,text) {
            ol.proj.addProjection(projection);
            var projSwitcher = this.get('element');
            var newProjOption = document
              .createElement('option');
            newProjOption.value = projection.getCode();
            newProjOption.textContent = text;//projection.getCode();
            projSwitcher.appendChild(newProjOption);
          };

          var projControl = new ol.control.Projection({
            target : document.getElementById('projection')
          });

          var bngProj = new ol.proj.Projection({
            code : 'EPSG:27700',
            extent : bng.getExtent(),
            worldExtent : bng.getWorldExtent()
          });

          projControl.addProjection(bngProj,'OSGB National Grid');
          
          EPSG27700PROJECTIONS = [
            bngProj,
            new ol.proj.Projection({
              code : 'http://www.opengis.net/gml/srs/epsg.xml#27700',
              extent : bng.getExtent(),
              worldExtent : bng.getWorldExtent()
            }),
            new ol.proj.Projection({
              code : 'urn:x-ogc:def:crs:EPSG:27700',
              extent : bng.getExtent(),
              worldExtent : bng.getWorldExtent()
            })
          ];

          ol.proj.addEquivalentProjections(EPSG27700PROJECTIONS);

          // var erts = ol.proj.get('EPSG:4258');
          // var ertsProj = new ol.proj.Projection({
          //  code : 'EPSG:4258',
          //  extent : bng.getExtent(),
          //  worldExtent : bng.getWorldExtent(),
          // });
          // projControl.addProjection(ertsProj,'ERTS');

          // var tm75 = ol.proj.get('EPSG:29903');
          // var tm75Proj = new ol.proj.Projection({
          //  code : 'EPSG:29903',
          //  extent : bng.getExtent(),
          //  worldExtent : bng.getWorldExtent(),
          // });
          // projControl.addProjection(tm75Proj,'TM75');

          // var etrs89 = ol.proj.get('EPSG:2157');
          // var erts89Proj = new ol.proj.Projection({
          //  code : 'EPSG:2157',
          //  extent : bng.getExtent(),
          //  worldExtent : bng.getWorldExtent(),
          // });
          // projControl.addProjection(erts89Proj,'ETRS89');

          viewerMap.addControl(projControl);
        }

        window.setTimeout(checkForProjection, 500);

        // searchMap.addControl(projectionSwitcher);


        /** Facets configuration */
        searchSettings.facetsSummaryType = 'details';

        /*
           * Hits per page combo values configuration. The first one is the
           * default.
           */
        searchSettings.hitsperpageValues = [20, 50, 100];

        /* Pagination configuration */
        searchSettings.paginationInfo = {
          hitsPerPage: searchSettings.hitsperpageValues[0]
        };

        /*
           * Sort by combo values configuration. The first one is the default.
           */
        searchSettings.sortbyValues = [{
          sortBy: 'relevance',
          sortOrder: ''
        }, {
          sortBy: 'changeDate',
          sortOrder: ''
        }, {
          sortBy: 'title',
          sortOrder: 'reverse'
        }, {
          sortBy: 'rating',
          sortOrder: ''
        }, {
          sortBy: 'popularity',
          sortOrder: ''
        }, {
          sortBy: 'denominatorDesc',
          sortOrder: ''
        }, {
          sortBy: 'denominatorAsc',
          sortOrder: 'reverse'
        }];

        /* Default search by option */
        searchSettings.sortbyDefault = searchSettings.sortbyValues[0];

        /* Custom templates for search result views */
        searchSettings.resultViewTpls = [{
          tplUrl: '../../catalog/components/search/resultsview/' +
          'partials/viewtemplates/grid.html',
          tooltip: 'Grid',
          icon: 'fa-th'
        }];

        // For the time being metadata rendering is done
        // using Angular template. Formatter could be used
        // to render other layout

        // TODO: formatter should be defined per schema
        // schema: {
        // iso19139: 'md.format.xml?xsl=full_view&&id='
        // }
        searchSettings.formatter = {
          // defaultUrl: 'md.format.xml?xsl=full_view&id='
          // defaultUrl: 'md.format.xml?xsl=xsl-view&uuid=',
          // defaultPdfUrl: 'md.format.pdf?xsl=full_view&uuid=',
          list: [{
            label: 'full',
            url : function(md) {
              return '../api/records/' + md.getUuid() + '/formatters/xsl-view?root=div&view=advanced';
            }
          }]
        };

        // Mapping for md links in search result list.
        searchSettings.linkTypes = {
          links: ['LINK', 'kml'],
          downloads: ['DOWNLOAD'],
          //layers:['OGC', 'kml'],
          layers:['OGC'],
          maps: ['ows']
        };

        // Map protocols used to load layers/services in the map viewer
        searchSettings.mapProtocols = {
          layers: [
            'OGC:WMS',
            'OGC:WMS-1.1.1-http-get-map',
            'OGC:WMS-1.3.0-http-get-map',
            'OGC:WFS'
          ],
          services: [
            'OGC:WMS-1.3.0-http-get-capabilities',
            'OGC:WMS-1.1.1-http-get-capabilities',
            'OGC:WFS-1.0.0-http-get-capabilities',
	    'OGC:WFS'
          ]
        };

        // Set the default template to use
        searchSettings.resultTemplate =
          searchSettings.resultViewTpls[0].tplUrl;

        // Set custom config in gnSearchSettings
        angular.extend(searchSettings, {
          viewerMap: viewerMap,
          searchMap: searchMap
        });

        viewerMap.getLayers().on('add', function(e) {
          var layer = e.element;
          if (layer.get('advanced')) {
            gnNcWms.feedOlLayer(layer);
          }
        });

      }]);
})();
