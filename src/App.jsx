import { useState,useEffect  } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import _ from 'lodash'
import apis from '../data/fields.json'
import classification_controls from '../data/classification_controls_dedup.json'
import fields_summary from '../data/fields_summary.json'
import { createPortal } from 'react-dom'


function download ({content, filename="data.csv", type="text/csv;charset=utf-8;"}) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Trigger download
  a.click();
  URL.revokeObjectURL(url);
}

function Badge ({bg='bg-blue-300/20', border='border-blue-400', children}) {
    return <div className={` inline-block  text-xs px-1 rounded ${bg} border ${border}`}>{children}</div>
}
classification_controls.map(cc => {
  const v = {
    'excluded':<Badge bg='bg-gray-100' border="border-gray-300">Out of scope</Badge>,
    'optional':<Badge bg='bg-yellow-100' border="border-yellow-300">Optional</Badge>,
    'required':<Badge bg='bg-green-100' border="border-green-300">Available</Badge>,
  }[cc.control];
  cc.control_v = v;
 
})
console.log(classification_controls)


function App() {

  const [count, setCount] = useState(0);
  
  const [listed, setListed] = useState(true);
  
  const [query, setQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  function DefaultContent () { 
    return <div> No Content</div>
  }
  const [modalContent, setModalContent] = useState(<DefaultContent></DefaultContent>)

  const api = apis.find(a => a.code=='trackinsight-standard-api');
  // console.log(api.api_responses)
  const fields = [];
  api.api_responses.map(api_response => {
    // console.log(api_response.api_response_fields);
    api_response.api_response_fields.map(field => {
      if (field.oasis_fields.domain == null) field.oasis_fields.domain = "Base";
      fields.push(field);
    });
  });

  fields.map(field => {
    if (field.code.startsWith('class_')) {
      field.availabilityTable = _.orderBy(classification_controls
        .filter(cc => cc.column == field.code),x => [x.summary_asset_class,x.strategy].join(';'))
    }
    const summary = fields_summary.find(f => f.key == field.code);
    // if (field.code.startsWith('class_')) {
    //   console.log(field, summary)
    // }
    if (summary) {
      field.values = _.orderBy(summary.values, row => -row.count)
      field.values.map(row => {
        if (field.oasis_fields.oasis_field_values) {
          const field_v = field.oasis_fields.oasis_field_values.find(v => v.value == row.value)
          row.description = field_v?.description
        }
      })
    
      field.sample = _.orderBy(summary.sample, row => -row.count)
    }
  })

  const fieldGroups = _.uniqBy(fields.map(f => f.oasis_fields.domain ));

  const [currentField, setCurrentField] = useState(fields[10])

  function downloadFields () {
    const schema = [
      {colname:'oasis_fields.domain',label:'domain'},
      {colname:'code',label:'key'},
      {colname:'label',label:'label'},
      {colname:'oasis_fields.type',label:'type'},
      {colname:'oasis_fields.is_array',label:'is_array'},
      {colname:'oasis_fields.short_description',label:'short_description'},
    ];
    const csvContent = [schema.map( s => s.label ?? s.colname).join(';')];
    fields.map( f => {
      const line = schema.map(s => {
        const v = _.get(f,s.colname) ?? "";
        return `"${v}"`
      }).join(';')
      return csvContent.push(line);
    })
    download({content:csvContent.join('\n'), filename:'fields.csv'});
  }

  return (
    <div className="h-full flex flex-col text-left w-[1260px] m-auto ">
      
      <div className='py-4 px-4 gap-4 border-b border-gray-200 flex'>
        <div className="">
          <div className="text-xl font-bold"> Trackinsigt Standard API </div>
          <div className="font-bold"> Data Dictionary </div>
        </div>
        <div className="flex-grow"></div>
        <div className="text-gray-600 hover:text-black underline cursor-pointer" onClick={() => downloadFields()}>fields.csv</div>

      </div>
      
      <div className="flex-grow min-h-0 ">

        <div className="h-full min-h-0 flex gap-4 ">

          <div className="h-full w-[360px] min-w-[360px] p-4 flex flex-col ">
            <div className="py-3 mr-7">
              <input name="filter" className="w-full py-2 px-3 border  border-gray-200 rounded-sm" type='text' placeholder="Filter"
                value={query}
                onChange={(e) => setQuery(e.target.value)} ></input>
            </div>
            <div className="overflow-auto ">
              {fieldGroups.map(group => {
                return (
                  <div className='mb-4'>
                    <div className="font-bold px-3 mb-1">{group}</div>
                    {fields.filter(f => f.oasis_fields.domain == group).filter(f => {
                      if (query == "") return true;
                      let match = (f.label?.toLowerCase().includes(query.toLowerCase())
                      || f.code?.toLowerCase().includes(query.toLowerCase()))
                      || f.oasis_fields.code?.toLowerCase().includes(query.toLowerCase())
                      || f.oasis_fields.domain?.toLowerCase().includes(query.toLowerCase())
                      || f.oasis_fields.semantic_types?.label?.toLowerCase().includes(query.toLowerCase())
                      || f.values?.reduce((m,v) =>{ return m || v.value?.toLowerCase?.().includes(query.toLowerCase())} ,false)
                      return match;
                      
                    }).map(field => {
                      const t = field.oasis_fields.type?.substring(0, 3);
                      return (
                        <div className={`flex px-3 cursor-pointer text-sm ${currentField.code == field.code ? 'bg-gray-100' : ''}`} onClick={() => setCurrentField(field)}>
                          <div className="py-1 px-1">
                            {field.label}
                          </div>
                          <div className="flex-grow"></div>
                          <div className="py-1 px-1 border border-gray-100 text-xs">{t}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            
          </div>
          <div className="min-w-[840px] flex-grow p-4">
            <Details key={currentField.code} field={currentField} setModalContent={setModalContent} setModalOpen={setModalOpen}></Details>
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-500/20">
          
          {/* Clickable backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setModalOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-[1024px] bg-white shadow-xl">
            {modalContent}
          </div>
        </div>
      )}

    </div>
    
  )
}

function Details ({field,setModalContent, setModalOpen}) {

  
  const availability = {
    rows:field.availabilityTable,
    schema:[
      { colname:'summary_asset_class', label:"Asset Class"},
      { colname:'strategy', label:"Strategy"},
      { colname:'control_v', label:"Availability", align:'text-right'}
    ]
  };

  const [includingDelisted, setIncludingDelisted] = useState(false)
  field.values?.map(row => {
    row.value_2 = <div className='flex gap-2'>
      <div> <Display value={row.value}></Display> </div>
      {row.description ? <div className="px-2 text-gray-400 text-xs bg-gray-100 border border-gray-300 rounded-xl"> ? </div> : ""}
    </div>
    

  })
  const values = { 
    rows:field.values,
    schema:[
      { colname:'value_2', label:"Value", export_colname:"value"},
      { colname:'total_count', label:"Count", align:'text-right'}
    ]
  };
  const listed_values = {
    rows:field.values?.filter( v => v.listed_count > 0),
    schema:[
      { colname:'value_2', label:"Value", export_colname:"value"},
      { colname:'listed_count', label:"Count", align:'text-right'}
    ]
  }

  const sample = {
    rows:field.sample,
    schema:[
      { colname:'value', label:"Sample Value"},
    ]
  }
  
  const [active, setActive] = useState(0);
  const tabs = []//'Values','Sample'];

  if (field.values?.length) tabs.push("Values")
  if (field.sample?.length) tabs.push("Sample")
  if (field.availabilityTable?.length) tabs.push("Availability")

  const onSelectedValue = (row) => {
    const schema =  [
      { colname:'share_id', label:"Share ID"},
      { colname:'isin', label:"Share ISIN"},
      { colname:'main_ticker', label:"  Ticker"},
      { colname:'share_label', label:"Share Label"},
      { colname:'column_value', label:"Column Value"},
    ]

    console.log(row)
    let content = null;
    if (row.description) {
      content = <DocRenderer data={row.description}></DocRenderer>
    }

    const el = <div className="p-4">
      <div className="mb-6">
        <div className="px-2 py-1 font-bold text-xs">Value</div>
        <div className="px-2 ">{row.value}</div>
      </div>
      <div className="mb-6">
        <div className="px-2 py-1 font-bold text-xs">Examples</div>
        <Table rows = {row.samples} schema={schema}></Table>
      </div>
      { content==null ? "" : <div className="">
        <div className="px-2 py-1 font-bold text-xs">Additional Information</div>
        <div className="px-2 text-sm">{content}</div>
      </div>}
    </div>
    setModalContent(el)
    setModalOpen(true)
  }

 
  return <div className="flex gap-8 w-full text-sm">
    <div className="w-full">
      <div className="flex gap-6 mb-6 border-gray-200 pt-6">
        <div className="min-w-32">
          <div className="font-bold text-xs">Domain</div>
          <div className="">{_.get(field,'oasis_fields.domain')}</div>
        </div>
        <div className="min-w-32">
          <div className="font-bold text-xs">Label</div>
          <div className="">{_.get(field,'label')}</div>
        </div>
        <div className="min-w-32">
          <div className="font-bold text-xs">Key</div>
          <div className="">{_.get(field,'code')}</div>
        </div>
        <div className="min-w-32">
          <div className="font-bold text-xs">Type</div>
          {field.oasis_fields?.is_array ?
             <div className="">{_.get(field,'oasis_fields.type')}[]</div>
           : <div className="">{_.get(field,'oasis_fields.type')}</div>
          }
        </div>
        {/* <div className="min-w-32">
          <div className="font-bold text-xs">Semantic Type</div>
          <div className="">{_.get(field,'oasis_fields.semantic_types.label')}</div>
        </div> */}
      </div>
      
      <div className="flex gap-6 mb-6 border-t border-gray-200 pt-6">
        <div className="min-w-32">
          <div className="font-bold text-xs">Sourcing</div>
          <div className="">{_.get(field,'oasis_fields.sourcing')}</div>
        </div>
        <div className="min-w-32">
          <div className="font-bold text-xs">Short Description</div>
          <div className="">{_.get(field,'oasis_fields.short_description')}</div>
        </div>
      
      </div>

      <div className="w-full">
        <div className="w-full flex border-b  border-gray-200">
          {tabs.map((tab, i) => (
            <div
              key={tab}
              onClick={() => setActive(i)}
              className={`px-4 py-2 ${
                active === i
                  ? "cursor-pointer text-black bg-white border-b-2 border-black"
                  : "cursor-pointer text-gray-500 bg-white hover:text-black"
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="py-4">
          {tabs[active]=="Availability" && <div>
              <Table rows={availability.rows} schema={availability.schema}></Table> 
            </div>
          } 
          {tabs[active]=="Values" && <div>
              <div className="flex">
                <div className='flex-grow'></div>
                <div className="py-2 cursor-pointer">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="cursor-pointer"
                      type="checkbox"
                      checked={includingDelisted}
                      onChange={(e) => setIncludingDelisted(e.target.checked)}
                    />
                    Including Delisted Products
                  </label>
                </div>
              </div>
              <Table rows={(includingDelisted ? values: listed_values).rows} schema={(includingDelisted ? values: listed_values).schema} onRowClicked={row => onSelectedValue(row)}></Table> 
            </div>
          } 
          {tabs[active]=="Sample" && <div>
              <Table rows={sample.rows} schema={sample.schema}></Table> 
            </div>
          }
           {tabs[active]=="Endpoints" && <div>
              <Table rows={sample.rows} schema={sample.schema}></Table> 
            </div>
          }
        </div>
      </div>

    </div>
  </div>

}

function Display({value}) {
  if (value===null)  return <span className={"text-gray-400 italic"}> null</span>
  if (value===undefined)  return <span className={" text-gray-400 italic"}> undefined</span>
  if (value==="")  return <span className={" text-gray-400 italic"}> empty string</span>
  if (value==="Multiple Values")  return <span className={" text-gray-400 italic"}> Multiple Values</span>
  if (value===false)  return <span className={" text-gray-400 italic"}> false</span>
  if (value===true)  return <span className={" text-gray-400 italic"}> true</span>
  else return <span>{value}</span>;
}

function Table ({rows, schema, pageSize=10, onRowClicked}) {

  function downloadCSV () {
    const csvContent= [schema.map(s => s.label).join(',')];
    rows.map(row => {
      csvContent.push(schema.map(s => {
        return row[s.export_colname ?? s.colname]
      }).join(','));
    })
    download({content:csvContent.join('\n')});
  }


  const [query,setQuery] = useState(null);
  const [filteredRows, setFilteredRows] = useState(rows);
  const [maxPage, setMaxPage] = useState(1);
  const [pages, setPages] = useState([1]);
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState(_.take(_.drop(rows,(page-1) * pageSize),pageSize));

  useEffect(() => {
    const newFilteredRows = rows.filter(row => {
        if (query == null || query=='') return true;
        for (const col of schema) {
          
          if (row[col.export_colname ?? col.colname]?.toString()?.toLowerCase()?.includes(query?.toLowerCase())) return true;
        }
        return false
      })

    const newMaxPage = Math.ceil(newFilteredRows.length / pageSize)
    const newPages = [];
    while (newPages.length < newMaxPage) newPages.push(newPages.length + 1);
    
    setMaxPage(newMaxPage);
    setPages(newPages);
    setFilteredRows(newFilteredRows)
    const newPageData = _.take(_.drop(newFilteredRows,(page-1) * pageSize),pageSize);
    setPageData(newPageData);

  }, [query])

  


  const nextPage = () => {
    if (page >= maxPage) return;
    goToPage(page+1);
  };
  const prevPage = () => {
    console.log(page, 1)
    if (page <= 1) return;
    goToPage(page-1);
  }

  const goToPage = (page) => {
    
    setPage(page);
    setPageData(_.take(_.drop(rows, (page-1) * pageSize), pageSize));
  }

  return <div>
      <input name="filter" className="px-1 py-1 border mt-3 mb-1 outline-w-1 border-gray-200 rounded-sm" type='text' placeholder="Filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)} ></input> 
      <div className="border border-gray-200 rounded-md text-sm">
      <table className="w-full">
        <thead>
          <tr>
            {schema.map(col => {
              return <th className={col.align} >{col.label}</th>
            })}
          </tr>
        </thead>
        <tbody>
          {pageData
          .map(row => {
            
            return <tr className="cursor-pointer hover:bg-gray-100/50 text-xs" onClick={() => onRowClicked && onRowClicked(row)}>
              {schema.map(col => {
                return <td className={col.align}>{row[col.colname]}
                </td>
              })}
            </tr>
          })}
        </tbody>
      </table>
      <div className="flex gap-2 p-2 text-xs bg-gray-100">
          <div className=''>{rows.length} rows</div>
          <div className="hover:underline cursor-pointer" onClick={() => downloadCSV()}>Download .csv</div>
          <div className='flex-grow'></div>
          <div className="hover:border-gray-400 border border-gray-100 rounded-sm cursor-pointer  px-1" onClick={() =>  prevPage()}>Prev</div>
          {pages.map(p => {
            return <div className={`hover:border-gray-400 border border-gray-100 rounded-sm cursor-pointer px-1 ${p == page ? 'bg-gray-200' : ''}`} onClick={() => goToPage(p)}>{p}</div>
          })}
          <div className="hover:border-gray-400 border border-gray-100 rounded-sm cursor-pointer  px-1"  onClick={() =>  nextPage()}>Next</div>

      </div>
    </div>
  </div>

}

function DocRenderer({data}) {
  
  return <div>
    {data.blocks.map(block => {
      return <div className="py-1" dangerouslySetInnerHTML={{ __html: block.data?.text }}/>
    })}
  </div>
}

export default App
