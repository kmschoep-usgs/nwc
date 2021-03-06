describe('Tests for NWC.view.AquaticBiologyMapView', function() {

	var addLayersSpy;
	var featuresModel;
	var eventSpyObj;
	var thisTemplate;
	var view;

	var $gageLayerButton, $hucLayerButton, $observedInfo, $modeledInfo

	beforeEach(function() {
		CONFIG = {
			endpoint : {
				geoserver : 'http://fakeserver.com'
			}
		};

		thisTemplate = jasmine.createSpy();

		templateHtml = '<div id="map-div"></div>' +
			'<button id="gage-layer-button"></button>' +
			'<button id="huc-layer-button"></button>' +
			'<span id="streamflow-observed-info"></span>' +
			'<span id="modeled-streamflow-info"></span>'
		$('body').append('<div id="test-div"></div>');
		$('#test-div').append(templateHtml);

		addLayersSpy = jasmine.createSpy('addLayerSpy');
		spyOn(NWC.util.mapUtils, 'addFlowLinesToMap');
		spyOn(NWC.view.BaseSelectMapView.prototype, 'initialize').andCallFake(function() {
			this.map = {
				addLayers : addLayersSpy,
				updateSize : jasmine.createSpy('updateSizeSpy')
			};
		});

		featuresModel = jasmine.createSpyObj('featuresModel', ['set']);

		eventSpyObj = jasmine.createSpyObj('eventSpyObj', ['preventDefault']);

		view = new NWC.view.AquaticBiologyMapView({
			aquaticBiologyFeaturesModel : featuresModel,
			template : thisTemplate,
			el : $('#test-div')
		});
		$gageLayerButton = $('#gage-layer-button');
		$hucLayerButton = $('#huc-layer-button');
		$observedInfo = $('#streamflow-observed-info');
		$modeledInfo = $('#modeled-streamflow-info');
	});

	afterEach(function() {
		$('#test-div').remove();
	});

	it('Expects appropriate properties to be defined after instantation', function() {
		expect(view.bioDataSitesLayer).toBeDefined();
		expect(view.gageFeatureLayer).toBeDefined();
		expect(view.hucLayer).toBeDefined();

		expect(addLayersSpy).toHaveBeenCalled();
		expect(view.selectControl).toBeDefined();
	});

	it('Expects updating the gageLayerOn in the model to update the view', function() {
		view.model.set('gageLayerOn', true);
		expect(view.gageFeatureLayer.getVisibility()).toBe(true);
		expect($gageLayerButton.hasClass('active')).toBe(true);
		expect($observedInfo.is(':visible')).toBe(true);

		view.model.set('gageLayerOn', false);
		expect(view.gageFeatureLayer.getVisibility()).toBe(false);
		expect($gageLayerButton.hasClass('active')).toBe(false);
		expect($observedInfo.is(':visible')).toBe(false);
	});

	it('Expects updating the hucLayerOn attribute in the mode to update the view', function() {
		view.model.set('hucLayerOn', true);
		expect(view.hucLayer.getVisibility()).toBe(true);
		expect($hucLayerButton.hasClass('active')).toBe(true);
		expect($modeledInfo.is(':visible')).toBe(true);

		view.model.set('hucLayerOn', false);
		expect(view.hucLayer.getVisibility()).toBe(false);
		expect($hucLayerButton.hasClass('active')).toBe(false);
		expect($modeledInfo.is(':visible')).toBe(false);
	});

	it('Expects calling toggleGageLayer to toggle the model\'s gageLayerOn attribute', function() {
		var initialState = view.model.get('gageLayerOn');
		view.toggleGageLayer(eventSpyObj);

		expect(view.model.get('gageLayerOn')).not.toBe(initialState);

		view.toggleGageLayer(eventSpyObj);
		expect(view.model.get('gageLayerOn')).toBe(initialState);
	});

	it('Expects calling toggleHucLayer to toggle the model\'s hucLayerOn attribute', function() {
		var initialState = view.model.get('hucLayerOn');
		view.toggleHucLayer(eventSpyObj);

		expect(view.model.get('hucLayerOn')).not.toBe(initialState);

		view.toggleHucLayer(eventSpyObj);
		expect(view.model.get('hucLayerOn')).toBe(initialState);
	});

	it('Expects calling turnOnLayers to set both layerOn attributes to true', function() {
		view.model.set({gageLayerOn : false, hucLayerOn : false});
		view.turnOnLayers();
		expect(view.model.get('gageLayerOn')).toBe(true);
		expect(view.model.get('hucLayerOn')).toBe(true);
	});

	it('Expects calling turnOffLayers to set both layerOn attributes to false', function() {
		view.model.set({gageLayerOn : true, hucLayerOn : true});
		view.turnOffLayers();
		expect(view.model.get('gageLayerOn')).toBe(false);
		expect(view.model.get('hucLayerOn')).toBe(false);
	});
});