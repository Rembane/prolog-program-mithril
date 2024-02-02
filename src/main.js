import mount from "mithril/mount";
import { request } from "mithril/request";
import hyperscript from "mithril/hyperscript";
import { handleCSRFProtection } from "./csrf";

// Happily stolen from Mithril to make the bundle size smaller.
var m = function m() {
  return hyperscript.apply(this, arguments);
};
m.request = request;
m.mount = mount;

let defaultState = {
  showVerbose: false,
  onlyShowPepp: false,
  ordering: "lexical",
  showType: 0,
  filterByDay: -1, // Not active by default.
};

let state = defaultState;
try {
  let s = JSON.parse(window.localStorage.getItem("prolog-program"));
  if (s != null) {
    state = s;
  }
} catch {}

var FlatProgram = [];
var GroupedProgram = {};
var EventTypes = [];

function save() {
  window.localStorage.setItem("prolog-program", JSON.stringify(state));
}

var Main = {
  view: function () {
    function verboseFun(isVerbose) {
      return function (e) {
        e.preventDefault();
        state.showVerbose = isVerbose;
        save();
      };
    }
    function peppFilterFun(isOnlyPepp) {
      return function (e) {
        e.preventDefault();
        state.onlyShowPepp = isOnlyPepp;
        save();
      };
    }
    function orderFun(ordering) {
      return function (e) {
        e.preventDefault();
        state.ordering = ordering;
        save();
      };
    }
    function typeFun(typeId) {
      return function (e) {
        e.preventDefault();
        state.showType = typeId;
        save();
      };
    }
    function dayFun(dayId) {
      return function (e) {
        e.preventDefault();
        state.filterByDay = dayId;
        save();
      };
    }
    function peppMe(programItem) {
      return function (e) {
        e.preventDefault();
        m.request(
          handleCSRFProtection({
            method: programItem.pepp ? "DELETE" : "POST",
            url: document.config.peppUrl,
            body: programItem.pk,
          })
        ).then((r) => {
          programItem.pepp = r.pepp;
        });
      };
    }
    function renderTheProgram() {
      // There are two ways to render the program, the flat way or the
      // grouped way. They are called lexical and time to make it simpler.
      if (state.ordering == "lexical") {
        var et = EventTypes.find(function (e) {
          return e.pk == state.showType;
        });
        return et && et != undefined
          ? renderGroupOfProgramItems(et)
          : [].concat.apply(
              [],
              EventTypes.map(function (e) {
                return renderGroupOfProgramItems(e);
              })
            );
      } else {
        return m(
          "ul",
          filterProgramItems(FlatProgram).map(function (pi) {
            return renderOneItem(pi);
          })
        );
      }
    }

    return m(
      "main#program",
      [
        m("div.side-by-side", [
          m(
            "ul.button-list",
            [
              { label: "Lista", prop: false },
              { label: "Beskrivningar", prop: true },
            ].map(function (x) {
              return m("li", [
                m(
                  "button",
                  {
                    onclick: verboseFun(x.prop),
                    class: state.showVerbose == x.prop ? "active glow" : null,
                  },
                  x.label
                ),
              ]);
            })
          ),
          document.config.loggedIn
            ? m(
                "ul.button-list",
                [
                  { label: "Allt", prop: false },
                  { label: "Bara pepp", prop: true },
                ].map(function (x) {
                  return m("li", [
                    m(
                      "button",
                      {
                        onclick: peppFilterFun(x.prop),
                        class:
                          state.onlyShowPepp == x.prop ? "active glow" : null,
                      },
                      x.label
                    ),
                  ]);
                })
              )
            : null,
          m(
            "ul.button-list",
            [
              { label: "Bokstavsordning", prop: "lexical", disabled: false },
              { label: "Tidsordning", prop: "time", disabled: FlatProgram.length == 0 },
            ].map(function (x) {
              return m("li", [
                m(
                  "button",
                  {
                    onclick: orderFun(x.prop),
                    class: state.ordering == x.prop ? "active glow" : null,
                    disabled: x.disabled,
                  },
                  x.label
                ),
              ]);
            })
          ),
        ]),
        m(
          "ul.button-list",
          [
            m("li#all-types", [
              m(
                "button",
                {
                  onclick: typeFun(0),
                  class: state.showType == 0 ? "active glow" : null,
                },
                "Alla"
              ),
            ]),
          ].concat(
            EventTypes.map(function (et) {
              return m("li", [
                m(
                  "button." + et.slug,
                  {
                    onclick: typeFun(et.pk),
                    class: state.showType == et.pk ? "active glow" : null,
                  },
                  et.name
                ),
              ]);
            })
          )
        ),

        m(
          "ul.button-list",
          [
            { label: "Alla dagar", idx: -1 },
            { label: "Fredag", idx: 5 },
            { label: "Lördag", idx: 6 },
            { label: "Söndag", idx: 0 },
          ].map(function (day) {
            return m("li", [
              m(
                "button",
                {
                  onclick: dayFun(day.idx),
                  class: state.filterByDay == day.idx ? "active glow" : null,
                },
                day.label
              ),
            ]);
          })
        ),
      ].concat(renderTheProgram())
    );
    function renderOneItem(pi) {
      var dayNames = [
        "söndag",
        "måndag",
        "tisdag",
        "onsdag",
        "torsdag",
        "fredag",
        "lördag",
      ];
      function zeroPadInt(n) {
        return ("0" + n).slice(-2);
      }
      function formatTime(d) {
        return zeroPadInt(d.getHours()) + ":" + zeroPadInt(d.getMinutes());
      }
      return m(
        "li",
        [
          m("a.event-link", { href: pi.url }, pi.name),
          pi.pepp && !state.onlyShowPepp ? " ★" : null,
        ]
          .concat(
            state.showVerbose
              ? [
                  m("p.arr", pi.organizers),
                  m("p.besk", pi.description),
                  m("p.vad", [m("span.hjarta", "♥"), pi.whatsinitforme]),
                  m("p.taggar", pi.tags.join(", ")),
                ]
              : []
          )
          .concat(
            pi.schevents
              ? [
                  m(
                    "ul",
                    pi.schevents.map(function (s) {
                      return m("li", [
                        dayNames[s.start.getDay()].substring(0, 3) +
                          " " +
                          formatTime(s.start) +
                          " – " +
                          formatTime(s.stop) +
                          " " +
                          s.location,
                      ]);
                    })
                  ),
                ]
              : []
          )
          .concat(
            state.showVerbose && document.config.loggedIn
              ? [
                  m(
                    "p",
                    m(
                      "button.pure-button",
                      { onclick: peppMe(pi) },
                      pi.pepp ? "Opeppa!" : "Peppa!"
                    )
                  ),
                ]
              : []
          )
      );
    }
    function filterProgramItems(pis) {
      return pis.filter(function (pi) {
        return (
          (state.filterByDay != -1
            ? pi.schevents
                .map(function (s) {
                  return s.start.getDay();
                })
                .indexOf(state.filterByDay) != -1
            : true) &&
          (document.config.loggedIn && state.onlyShowPepp ? pi.pepp : true) &&
          (state.showType > 0 ? state.showType == pi.type : true)
        );
      });
    }
    function renderGroupOfProgramItems(eventType) {
      var programItems = filterProgramItems(
        GroupedProgram[eventType.pk] || []
      ).map(function (pi) {
        return renderOneItem(pi);
      });
      if (programItems.length > 0) {
        return [m("h2.typeheader", eventType.name), m("ul", programItems)];
      }
      return [];
    }
  },
};

m.mount(document.config.attachTo, Main);
m.request({
  method: "GET",
  url: document.config.programApiUrl,
  deserialize: function (pies) {
    return pies.map(function (p) {
      p.schevents = p.schevents.map(function (s) {
        return {
          start: new Date(s.start),
          stop: new Date(s.stop),
          location: s.location,
        };
      });
      p.schevents.sort(function (a, b) {
        return a.start.getTime() - b.start.getTime();
      });
      return p;
    });
  },
}).then((r) => {
  // Duplicate the events to have one event per scheduled occurence and then
  // sort them by time.
  FlatProgram = r.reduce(function (p, v) {
    return p.concat(
      v.schevents.map(function (s) {
        return Object.assign({}, v, { schevents: [s] });
      })
    );
  }, []);
  var cmpHelper = function (propFun) {
    return function (a, b) {
      var p1 = propFun(a);
      var p2 = propFun(b);
      if (p1 < p2) {
        return -1;
      } else if (p1 > p2) {
        return 1;
      } else {
        return 0;
      }
    };
  };
  FlatProgram.sort(
    cmpHelper(function (v) {
      if (v.schevents.length > 0) {
        return v.schevents[0].start;
      } else {
        return 0;
      }
    })
  );

  if(FlatProgram.length == 0) {
    state.ordering = "lexical";
    save();
  }

  // Group by event type.
  GroupedProgram = r.reduce(function (p, v) {
    if (!p[v.type]) {
      p[v.type] = [];
    }
    p[v.type].push(v);
    return p;
  }, {});
});
m.request({
  method: "GET",
  url: document.config.eventTypeApiUrl,
}).then((r) => {
  EventTypes = r;
});
