var cy = null;
var mt = Mousetrap();
var slideout;
var cm = null;
var selected = [];
var position = null;
var layout = null;
var running = false;
var cyJson  = {};
var json;
var defaultJSON = "{\"analyst_email\":\"40170722@live.napier.ac.uk\",\"analyst_name\":\"Nathan Mair\",\"created\":\"2018-02-23T02:27:36\",\"edges\":[{\"id\":\"a1s1\",\"source_id\":\"a1\",\"target_id\":\"s1\"},{\"id\":\"a2s1\",\"source_id\":\"a2\",\"target_id\":\"s1\"},{\"id\":\"a3s2\",\"source_id\":\"a3\",\"target_id\":\"s2\"},{\"id\":\"s2a5\",\"source_id\":\"s2\",\"target_id\":\"a5\"},{\"id\":\"s1a4\",\"source_id\":\"s1\",\"target_id\":\"a4\"},{\"id\":\"a4s2\",\"source_id\":\"a4\",\"target_id\":\"s2\"}],\"edited\":\"2018-02-23T02:27:36\",\"id\":\"94a975db-25ae-4d25-93cc-1c07c932e2f9\",\"metadata\":{},\"nodes\":[{\"id\":\"a1\",\"metadata\":{},\"sources\":[],\"text\":\"Every person is going to die\",\"type\":\"atom\"},{\"id\":\"a2\",\"metadata\":{},\"sources\":[],\"text\":\"You are a person\",\"type\":\"atom\"},{\"id\":\"a3\",\"metadata\":{\"test\":\"test\"},\"sources\":[],\"text\":\"If you are going to die then you should treasure every moment\",\"type\":\"atom\"},{\"id\":\"a4\",\"metadata\":{},\"sources\":[],\"text\":\"You are going to die\",\"type\":\"atom\"},{\"id\":\"a5\",\"metadata\":{},\"sources\":[],\"text\":\"You should treasure every moment\",\"type\":\"atom\"},{\"id\":\"s1\",\"name\":\"Default Support\",\"type\":\"scheme\"},{\"id\":\"s2\",\"name\":\"Default Support\",\"type\":\"scheme\"}],\"resources\": []}";
var focused;
var undo_stack = [];
var redo_stack = [];
var edit_atom = null;
var test;

var cola_params = {
    name: "cola",
    animate: true,
    randomize: true,
    padding: 100,
    fit: false,
    maxSimulationTime: 1500
};

initialise();

function initialise() {

    //load diagram if there is one in localStorage
    if (localStorage.getItem("state"))
    {
        loadJSON(localStorage.getItem("state"));
        initCytoscape();
    //else use default
    } else
    {
        localStorage.setItem("state",defaultJSON);
        test = defaultJSON;
        json = import_json(defaultJSON);
        cyJson = export_cytoscape(json);
        initCytoscape();
    }
}

function loadJSON(json_value) {
    json = import_json(json_value);
    localStorage.setItem("state",JSON.stringify(get_sd()));
    test = JSON.stringify(get_sd());
    //load any sources in the stored diagram state
    window.onload = function () {
        loadTabs(json.resources);
    };
    cyJson = export_cytoscape(json);
    if(cy !== null)
    {
        cy.elements().remove();
        cy.json({elements: JSON.parse(cyJson)});
        redraw_visualisation();
    }
}

function loadTabs(tabs) {
    tabs.forEach(function(tab) {
       load_tab(tab);
    });
}

function initCytoscape() {
cy = cytoscape({
    container: document.getElementById("cy"),
    ready: function(){ window.cy = this; },
    elements: JSON.parse(cyJson),
    style:[
        { selector: "node", style: {
            "content": "data(content)",
            "text-opacity": 0.6,
            "width" : "auto",
            "height" : "auto",
            "text-valign": "bottom",
            "text-halign": "right",
            "text-outline-color": "#eee",
            "text-outline-width": 3
            }
        },
        { selector: "[typeshape]", style: {
            "shape":"data(typeshape)"
            }
        },

        { selector: "edge", style: {
            "line-color": "#9dbaea",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#9dbaea",
            "curve-style": "bezier"
            }
        },
        { selector: ":selected", style: {
            "border-width":"3",
            "border-color":"#333333"
            }
        },
        {
            selector: ".atom-label", style:{
                "text-wrap": "wrap",
                "text-max-width": 160
            }
        },
        {
            selector: ".scheme-label", style:{
                "text-wrap": "wrap",
                "text-max-width": 160
            }
        }
        ],
        boxSelectionEnabled: false,
        autounselectify: false,
        selectionType: "single",
        minZoom: 0.05,
        maxZoom: 2

});

    layout = build_cola_layout();
    layout.run();

    cy.elements("node[type = \"atom\"]").qtip({
        content: "Metadata about this atom",
        position: {
            my: "top center",
            at: "bottom center"
        },
        style: {
            classes: "qtip-bootstrap",
            tip: {
                width: 16,
                height: 8
            }
        }
    });


   cy.edgehandles({
        toggleOffOnLeave: true,
        handleNodes: "node",
        handleSize: 20,
        handleColor: "orange",
        handleHitThreshold: 8,
        handleLineWidth: 5,
        //handleLineType: "flat",
        handleOutlineColor: "grey",
        edgeType: function(){ return "flat"; },
        complete: function(event, sourceNode, targetNode, addedEles){
            if (targetNode.length !== 0) {
                var source_id = targetNode[0].source().id();
                var target_id = targetNode[0].target().id();

                //get the mid point between source node and target node
                var source_position = targetNode[0].source().position();
                var target_position = targetNode[0].target().position();

                position = {};
                position.x = ((source_position.x + target_position.x)/2);
                position.y = ((source_position.y + target_position.y)/2);

                if (targetNode[0].source().data().type == "atom" && targetNode[0].target().data().type == "atom")
                {
                    var scheme = add_scheme("Default Support");
                    var scheme_id = scheme.id;
                    var scheme_content = scheme.name;
                    //remove the automatically generated edge
                    targetNode.remove();
                    cy.add([
                        {group: "nodes", data: {id: scheme_id.toString(),
                            content: scheme_content, typeshape: "diamond" }, classes: "scheme-label", locked: false, position: position}
                    ]);
                    var edge1 = add_edge(source_id, scheme_id);
                    var edge2 = add_edge(scheme_id, target_id);
                    cy.add([
                      { group: "edges", data: { id: edge1.id.toString(), source: source_id, target: scheme_id } },
                      { group: "edges", data: { id: edge2.id.toString(), source: scheme_id, target: target_id } }
                    ]);
                } else {
                    targetNode.remove();
                    var edge = add_edge(source_id, target_id);
                    cy.add([
                      { group: "edges", data: { id: edge.id.toString(), source: source_id, target: target_id } }
                    ]);
                }
                update_local_storage();
            } else {
                targetNode.remove();
            }
        }
    });
/*
 *
 * Set up context menus
 *
 * */
cm = cy.contextMenus({
    menuItems: [
      {
        id: "edit-content",
        title: "edit content",
        selector: "node[type = \"atom\"]",
        onClickFunction: function (event) {
          var target = event.target || event.cyTarget;
          $("#editContentModal").modal("show");
          $("#edit_atom_content").val(target.data().content);
          edit_atom = target;
        },
        hasTrailingDivider: false
      },
      {
        id: "edit-metadata",
        title: "edit metadata",
        selector: "node[type = \"atom\"]",
        onClickFunction: function (event) {
            $("#edit_metadata").empty();
            var target = event.target || event.cyTarget;
            var atom = get_atom(target.id());
            var textArea = $("<textarea id=\""+target.id()+"_metadata\" class=\"form-control\" rows=\"2\" >"+JSON.stringify(atom.metadata)+"</textarea>");
            $("#edit_metadata").append(textArea);
            $("#editMetadataModal").modal("show");
            edit_atom = target;
        },
        hasTrailingDivider: true
      },
      {
        id: "change-scheme",
        title: "change scheme",
        selector: "node[typeshape = \"diamond\"]",
        onClickFunction: function (event) {
            var target = event.target || event.cyTarget;
            $("#editSchemeModal").modal("show");
            edit_atom = target;
        },
        hasTrailingDivider: true
      },
      {
        id: "remove",
        title: "remove",
        selector: "node, edge",
        onClickFunction: function (event) {
            var target = event.target || event.cyTarget;
            if (selected.length !== 0) {
                selected.forEach(function(node) {
                    delete_nodes(node);
                });
                selected = [];
            } else {
                if (target.data().type=="atom") {
                    delete_nodes(event);
                    target.remove();
                } else if (target.data().typeshape=="diamond"){
                    delete_nodes(event);
                    target.remove();
                } else {
                    delete_edge(target.id());
                    update_local_storage();
                    target.remove();
                }
            }
        },
        hasTrailingDivider: true
      },
      {
        id: "add-atom",
        title: "add atom",
        coreAsWell: true,
        onClickFunction: function (event) {

            position = event.position || event.cyPosition;
            var selected_text = get_selected_text();
            if (selected_text === undefined)
            {
                $("#newAtomModal").modal("show");
            } else {
                add_new_atom_node(selected_text);
            }
        }
      },
      {
        id: "add-scheme",
        title: "add scheme",
        coreAsWell: true,
        onClickFunction: function (event) {

            position = event.position || event.cyPosition;

            document.getElementById("sel1").options.selectedIndex=0;
            $("#newSchemeModal").modal("show");
        },
        hasTrailingDivider: true
      },
      {
        id: "redraw",
        title: "redraw",
        coreAsWell: true,
        onClickFunction: function (event) { redraw_visualisation(); },
        hasTrailingDivider: true
      },
      {
        id: "undo",
        title: "undo",
        selector: "node, edge",
        show: false,
        coreAsWell: true,
        onClickFunction: function (event) {
          undo();
        },
        hasTrailingDivider: false
      },
      {
        id: "redo",
        title: "redo",
        selector: "node, edge",
        show: false,
        coreAsWell: true,
        onClickFunction: function (event) {
          redo();
          if (redo_stack == []) {
            cm.hideMenuItem("redo");
          }
        },
        hasTrailingDivider: true
      },
      {
          id: "merge_nodes",
          title: "merge nodes",
          selector: "node",
          show: false,
          coreAsWell: true,
          onClickFunction: function (event) {
              merge_nodes();
          }
      }
    ]
});

    cy.on("unselect", "node", function (e){
        selected.pop(e);
        cm.hideMenuItem("merge_nodes");
    });

    cy.on("select", "node", function (e){
        selected.push(e);
        if(selected.length>1) {
            cm.showMenuItem("merge_nodes");
        } else {
            cm.hideMenuItem("merge_nodes");
        }
    });

    cy.on("tap", function (e){
        //when cytoscape is tapped remove any focus from HTML elements like the tab textareas
        //this mainly helps with keybinds
        $(":focus").blur();
    });

    cy.on("layoutstart", function(){
        running = true;
    });

    cy.on("layoutstop", function(){
        running = false;
    });

    $(".resource-pane").resizable({
        handleSelector: ".splitter",
        resizeHeight: false,
        resizeWidthFrom: "right",
        //onDragStart: function (e, $el, opt) {},
        onDragEnd: function (e, $el, opt) {
            cy.resize();
        }
    });
}

/*
 *
 * Model Manipulation Functions
 *
 * */

    //******************************************************
    function add_new_atom_node(selected_text) {
        var content;
        if (selected_text !== undefined) {
            content = selected_text;
            window.getSelection().removeAllRanges();
        } else if(document.getElementById("new_atom_content").value !== "") {
            content = document.getElementById("new_atom_content").value;
        } else {
            //this occurs when a user drag/drops text not from the tab textarea, creating a blank node
            return;
        }
        var new_atom = add_atom(content);
        var atom_id = new_atom.id;
        if (selected_text !== undefined) {
            add_source(atom_id, focused, content, 0, 0);
        }
        cy.add([
            {group: "nodes", data: {id: atom_id.toString(),
                content: content, type: "atom", typeshape: "roundrectangle" }, classes: "atom-label", locked: false, renderedPosition: position}
        ]);
        update_local_storage();
    }

    function get_selected_text() {
        var selected_text = undefined;
        if (window.getSelection().toString().length>0)
        {
            if(window.getSelection().baseNode.id=="textarea")
            {
                selected_text = window.getSelection().toString();
                return selected_text;
            }
        }
    }

    function setFocused(element) {
        focused = document.getElementById(element.id).id;
    }

    function update_local_storage() {
        var undo_item = JSON.parse(test);
        undo_stack.push(undo_item);
        redo_stack = [];
        cm.showMenuItem("undo");
        cm.hideMenuItem("redo");
        localStorage.setItem("state", JSON.stringify(get_sd()));
        test = JSON.stringify(get_sd());
        update();
    }

    function undo() {
        if (undo_stack.length != 0) {
            var redo_item = get_sd();
            redo_stack.push(redo_item);
            state = undo_stack.pop();
            loadJSON(JSON.stringify(state));
            if (undo_stack.length == 0) {
                cm.hideMenuItem("undo");
            }
            cm.showMenuItem("redo");
        }
    }

    function redo() {
        if (redo_stack.length != 0) {
            var undo_item = get_sd();
            undo_stack.push(undo_item);
            state = redo_stack.pop();
            loadJSON(JSON.stringify(state));
            if (redo_stack.length == 0) {
                cm.hideMenuItem("redo");
            }
            cm.showMenuItem("undo");
        }
    }

    function change_title(tab_id) {
        var title = document.getElementById("title_"+tab_id).value;
        update_resource(tab_id, null, title);
        update_local_storage();
    }

    function change_textarea(tab_id) {
        var text = document.getElementById(tab_id).value;
        update_resource(tab_id, text, null);
        update_local_storage();
    }

    function dragover_handler(ev) {
         ev.preventDefault();
         // Set the dropEffect to move
         ev.dataTransfer.dropEffect = "move";
    }

    function drop_handler(ev) {
        ev.preventDefault();
        position = {"x": ev.clientX-350, "y": ev.clientY+200};
        add_new_atom_node(get_selected_text());
    }

    function merge_nodes() {
        //From all currently selected nodes, set first in selected to the base node, move all sources and edges related to each other node in selected to base node
        var target;
        var id;
        var atom;
        var baseNode = selected[0].target || selected[0].cyTarget;
        var baseId = baseNode.id();
        var baseAtom = get_atom(baseId);
        var edge;
        if (baseAtom.type == "atom") {
            sds = get_sd();
            var i = 0;
            selected.forEach(function(node){
                var j = 0;
                if (i > 0) {
                    target = selected[i].target || selected[i].cyTarget;
                    id = target.id();
                    atom = get_atom(id);
                    if (atom.type == "atom") {
                        atom.sources.forEach(function(source) {
                            add_source(baseId, atom.sources[j].resource_id, atom.sources[j].text, atom.sources[j].offset, atom.sources[j].length);
                            ++j;
                        });
                        j = 0;
                        sds.edges.forEach(function(edge) {
                            if (sds.edges[j].source_id == id) {
                                edge = add_edge(baseId,sds.edges[j].target_id);
                                cy.add([
                                  { group: "edges", data: { id: edge.id.toString(), source: baseId, target: sds.edges[j].target_id } }
                                ]);
                            }
                            if (sds.edges[j].target_id == id) {
                                edge = add_edge(sds.edges[j].source_id, baseId);
                                cy.add([
                                  { group: "edges", data: { id: edge.id.toString(), source: sds.edges[j].source_id, target: baseId } }
                                ]);
                            }
                            ++j;
                        });
                    delete_nodes(selected[i]);
                    } else {
                        alert("cannot merge scheme nodes");
                    }
                }
                ++i;
            });
            selected = [];
            cm.hideMenuItem("merge_nodes");
        } else {
            alert("cannot merge scheme nodes");
        }
    }

    function edit_atom_content() {
        var content = document.getElementById("edit_atom_content").value;
        var atom = cy.$("#"+edit_atom.id());
        update_atom_text(edit_atom.id(), content);
        update_local_storage();
        atom.data("content", content);
        edit_atom = null;
    }

    function edit_atom_metadata() {
        var atom = cy.$("#"+edit_atom.id());
        var content = document.getElementById(atom.id()+"_metadata").value;
        if (JSON.parse(content)) {
            var metadata = JSON.parse(content);
            update_atom_metadata(atom.id(), metadata);
            update_local_storage();
            edit_atom=null;
        } else {
            alert("Metadata not in JSON format, unable to update");
        }
    }

    function edit_scheme_content() {
        var scheme_idx = document.getElementById("sel2").options.selectedIndex;
        var content = document.getElementById("sel2").options[scheme_idx].text;
        var scheme = cy.$("#"+edit_atom.id());
        update_scheme(edit_atom.id(), content);
        update_local_storage();
        scheme.data("content", content);
        edit_atom = null;
    }

    function clear_local_storage() {
        localStorage.clear();
    }
    //******************************************************

    function add_new_scheme_node() {
        var scheme_idx = document.getElementById("sel1").options.selectedIndex;
        var scheme = document.getElementById("sel1").options[scheme_idx].text;
        var new_scheme = add_scheme(scheme);
        var scheme_id = new_scheme.id;

        cy.add([
            {group: "nodes", data: {id: scheme_id.toString(),
                content: scheme, typeshape: "diamond" }, classes: "scheme-label", locked: false, position: position}
        ]);
        update_local_storage();
    }

    function delete_nodes(event) {
        var target = event.target || event.cyTarget;
        var id = target.id();
        removed = target.remove();
        delete_atom(id);
        var i = 0;
        var sds = get_sd();
        var edges = sds.edges;
        edges.forEach(function(edge) {
            if (edges[i] !== undefined) {
                if (edges[i].source_id === id || edges[i].target_id === id) {
                    delete_edge(edges[i].id);
                }
                ++i;
            }
        });
        update_local_storage();
    }

    function redraw_visualisation() {
        layout.stop();
        layout.options.eles = cy.elements();
        layout.run();
    }


/*
 *
 * Slideout functions
 *
 * */

    slideout = new Slideout( {
        "panel": document.getElementById("panel"),
        "menu": document.getElementById("menu"),
        "fx": "ease",
        "side": "right",
        "duration": 500,
        "padding": 256,
        "tolerance": 70
    });

    slideout.on("close", function() { cy.resize(); } );
    slideout.on("open", function() { cy.resize(); } );

/*
 *
 * Cola Layout Functions
 *
 *
 * */

function build_cola_layout( opts )
{
    var i = 0;
    if (opts !== undefined) {
        opts.forEach(function(opt) {
           cola_params[i] = opts[i];
           ++i;
        });
    }
    return cy.makeLayout( cola_params );
}

/*
 *
 * Mousetrap - keypboard handler functions
 *
 * */


mt.bind("a", function() {

    var selected_text = get_selected_text();
    if (selected_text === undefined)
    {
        $("#newAtomModal").modal("show");
    } else {
        add_new_atom_node(selected_text);
    }
});

mt.bind("d", function() {
    selected.forEach(function(node) {
        delete_nodes(node);
    });
    selected = [];
});

mt.bind("f", function() {
    //TODO: FIX NODE PLACEMENT
});

mt.bind("s", function() {
    //TODO: SCALE SELECTED NODE
});

mt.bind("h", function() {
    $( "#resource-pane" ).toggle();
    $( "#splitter" ).toggle();
});

mt.bind("t", function() {
    //TODO: TOGGLE TEXT LABEL VISIBILITY
});

mt.bind(["command+z","ctrl+z"], function() {
    undo();
});

mt.bind(["command+y","ctrl+y"], function() {
    redo();
});


/*
 *
 * Modal Dialog Functions
 *
 * */

$("#newAtomModal").on("shown.bs.modal", function () {
    $("#new_atom_content").focus();
});

$("#newAtomModal").on("hidden.bs.modal", function(e) {
    $("#new_atom_content").val("").end();
});

$("#newSchemeModal").on("shown.bs.modal", function () {
    $("#sel1").focus();
});

$("#editContentModal").on("show.bs.modal", function() {

});

$("#editMetadataModal").on("show.bs.modal", function() {

});


$("#resource_text").blur(function() {
});


$(".toggle-button").click(function() {
    if(slideout.isOpen()) { slideout.close(); }
    else { slideout.open(); }
});