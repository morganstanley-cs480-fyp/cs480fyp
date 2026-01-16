import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { ArrowLeft, ArrowRight, AlertCircle, ArrowDownRight, Clock, Check, Plus } from 'lucide-react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls,
  MarkerType,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AIResolveExceptionDialog } from './AIResolveExceptionDialog';

interface Transaction {
  transId: string;
  time: string;
  entity: string;
  direction: 'SEND' | 'RECEIVE';
  transType: string;
  transStatus: string;
  step: number;
  exception?: {
    id: string;
    event: string;
    exceptionMsg: string;
    priority: 'HIGH' | 'LOW';
    comments: string;
    exceptionTime: string;
    updateTime: string;
  };
}

interface Solution {
  id: string;
  title: string;
  exceptionDescription: string;
  referenceEvent: string;
  solutionDescription: string;
  createTime: string;
  scores: number;
}

const mockTransactions: Transaction[] = [
  {
    transId: '2N94227',
    time: '1.75559E+12',
    entity: 'CLEARING HOUSE',
    direction: 'SEND',
    transType: 'Trade Approval Sys',
    transStatus: 'SEND',
    step: 1,
  },
  {
    transId: '2N94228',
    time: '1.75559E+12',
    entity: 'Trade Approval Sys',
    direction: 'RECEIVE',
    transType: 'Credit Check',
    transStatus: 'ACKNOWLEDGED',
    step: 2,
  },
  {
    transId: '2N94229',
    time: '1.75559E+12',
    entity: 'Trade Approval Sys',
    direction: 'SEND',
    transType: 'Approval',
    transStatus: 'APPROVED',
    step: 3,
  },
  {
    transId: '2N94230',
    time: '1.75559E+12',
    entity: 'CLEARING HOUSE',
    direction: 'RECEIVE',
    transType: 'Request_Consent',
    transStatus: 'RECEIVE',
    step: 4,
  },
  {
    transId: '2N94231',
    time: '1.75559E+12',
    entity: 'CLEARING HOUSE',
    direction: 'SEND',
    transType: 'JSCC',
    transStatus: 'SEND',
    step: 5,
  },
  {
    transId: '1310357',
    time: '1.75559E+12',
    entity: 'JSCC',
    direction: 'RECEIVE',
    transType: 'STATUS_UPDATE',
    transStatus: 'ALLEGED',
    step: 6,
  },
  {
    transId: '1310358',
    time: '1.75559E+12',
    entity: 'JSCC',
    direction: 'SEND',
    transType: 'REQUEST_CONSENT',
    transStatus: 'SEND',
    step: 7,
  },
  {
    transId: '1310359',
    time: '1.75559E+12',
    entity: 'Trade Approval Sys',
    direction: 'RECEIVE',
    transType: 'REQUEST_CONSENT',
    transStatus: 'PENDINGFIRM',
    step: 8,
  },
  {
    transId: '1310365',
    time: '1.75559E+12',
    entity: 'Trade Approval Sys',
    direction: 'SEND',
    transType: 'ACKNOWLEDGEMENT',
    transStatus: 'APPROVED',
    step: 9,
  },
  {
    transId: '1311021',
    time: '1.75559E+12',
    entity: 'JSCC',
    direction: 'RECEIVE',
    transType: 'APPROVAL_RESPONSE',
    transStatus: 'APPROVED',
    step: 10,
  },
  {
    transId: '1311022',
    time: '1.75559E+12',
    entity: 'JSCC',
    direction: 'SEND',
    transType: 'TRICLEAR_RESPONSE',
    transStatus: 'CONSENTGRANTED',
    step: 11,
  },
  {
    transId: '2N94232',
    time: '1.75559E+12',
    entity: 'CLEARING HOUSE',
    direction: 'RECEIVE',
    transType: 'CLEARING Confirmation',
    transStatus: 'RECEIVE',
    step: 12,
  },
  {
    transId: '2N94233',
    time: '1.75559E+12',
    entity: 'CLEARING HOUSE',
    direction: 'SEND',
    transType: 'Booking Confirmation',
    transStatus: 'SEND',
    step: 13,
  },
  {
    transId: '2N94234',
    time: '1.75559E+12',
    entity: 'BOOKING SYSTEM',
    direction: 'RECEIVE',
    transType: 'Trade Booked',
    transStatus: 'APPROVED',
    step: 14,
  },
  {
    transId: '1311026',
    time: '1.76219E+12',
    entity: 'Trade Approval Sys',
    direction: 'SEND',
    transType: 'PLATFORM_ACK',
    transStatus: 'SEND',
    step: 15,
    exception: {
      id: '51253968',
      event: '69690882',
      exceptionMsg: 'MISSING BIC',
      priority: 'HIGH',
      comments: 'NO BIC',
      exceptionTime: '2025-08-15 10:23:45',
      updateTime: '2025-08-15 10:25:12',
    },
  },
];

const mockSolutions: Solution[] = [
  {
    id: '387551',
    title: 'EB MAPPING',
    exceptionDescription: 'USER INPUT',
    referenceEvent: '',
    solutionDescription: '',
    createTime: '2025-02-15 09:30:22',
    scores: 23,
  },
  {
    id: '745500',
    title: 'RETRY MEMO',
    exceptionDescription: 'USER INPUT',
    referenceEvent: '',
    solutionDescription: '',
    createTime: '2025-04-08 14:12:45',
    scores: 37,
  },
  {
    id: '463491',
    title: 'BLACKSTONE MUSTREAD',
    exceptionDescription: 'USER INPUT',
    referenceEvent: '',
    solutionDescription: '',
    createTime: '2025-06-22 11:05:18',
    scores: 15,
  },
];

export function FlowVisualization() {
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<string>('');
  const [newSolutionTitle, setNewSolutionTitle] = useState<string>('');
  const [newSolutionDescription, setNewSolutionDescription] = useState<string>('');
  const [showCreateSolution, setShowCreateSolution] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>(mockSolutions);
  
  // For demo purposes, use a default trade ID
  const tradeId = 'TRD-2024-00156';

  const handleResolveWithExistingSolution = () => {
    if (!selectedTransaction?.exception || !selectedSolution) return;

    // Increment solution score
    setSolutions(solutions.map(sol =>
      sol.id === selectedSolution
        ? { ...sol, scores: sol.scores + 1 }
        : sol
    ));

    setResolveDialogOpen(false);
    setSelectedTransaction(null);
    setSelectedSolution('');
    alert('Exception resolved with existing solution!');
  };

  const handleResolveWithNewSolution = () => {
    if (!selectedTransaction?.exception || !newSolutionTitle || !newSolutionDescription) return;

    // Create new solution
    const newSolution: Solution = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      title: newSolutionTitle,
      exceptionDescription: 'USER INPUT',
      referenceEvent: selectedTransaction.exception.event,
      solutionDescription: newSolutionDescription,
      createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      scores: 0,
    };

    setSolutions([...solutions, newSolution]);

    setResolveDialogOpen(false);
    setSelectedTransaction(null);
    setShowCreateSolution(false);
    setNewSolutionTitle('');
    setNewSolutionDescription('');
    alert('Exception resolved with new solution!');
  };

  // Create nodes for the flow diagram
  const nodes: Node[] = [
    // Booking System (top left)
    {
      id: 'BOOKING SYSTEM',
      type: 'default',
      position: { x: 50, y: 50 },
      data: { label: 'Booking System' },
      style: { 
        background: '#ef9a9a', 
        border: '2px solid #e57373',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    // Trade Approval System (middle left)
    {
      id: 'Trade Approval Sys',
      type: 'default',
      position: { x: 50, y: 200 },
      data: { label: 'Trade Approval Sys' },
      style: { 
        background: '#c5e1a5', 
        border: '2px solid #9ccc65',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    // Affirmation System (bottom left)
    {
      id: 'Affirmation System',
      type: 'default',
      position: { x: 50, y: 350 },
      data: { label: 'Affirmation System' },
      style: { 
        background: '#b3e5fc', 
        border: '2px solid #4fc3f7',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    // Clearing House (center)
    {
      id: 'CLEARING HOUSE',
      type: 'default',
      position: { x: 300, y: 200 },
      data: { label: 'Clearing House' },
      style: { 
        background: '#ffe0b2', 
        border: '2px solid #ffb74d',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontWeight: 600,
      },
    },
    // JSCC (right center)
    {
      id: 'JSCC',
      type: 'default',
      position: { x: 550, y: 200 },
      data: { label: 'JSCC' },
      style: { 
        background: '#ce93d8', 
        border: '2px solid #ab47bc',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontWeight: 600,
      },
    },
  ];

  // Create edges based on transactions
  const edges: Edge[] = mockTransactions.map((transaction) => {
    let sourceNode = transaction.entity;
    let targetNode = '';
    
    // Determine target based on transaction type and direction
    if (transaction.direction === 'SEND') {
      // For SEND, the entity is the source, and transType indicates the target
      if (transaction.transType.includes('Trade Approval')) {
        targetNode = 'Trade Approval Sys';
      } else if (transaction.transType.includes('CLEARING') || transaction.transType.includes('Clearing')) {
        targetNode = 'CLEARING HOUSE';
      } else if (transaction.transType.includes('JSCC')) {
        targetNode = 'JSCC';
      } else if (transaction.transType.includes('Affirmation')) {
        targetNode = 'Affirmation System';
      } else {
        // Default routing based on source
        if (sourceNode === 'CLEARING HOUSE') {
          targetNode = 'Trade Approval Sys';
        } else if (sourceNode === 'BOOKING SYSTEM') {
          targetNode = 'CLEARING HOUSE';
        } else if (sourceNode === 'Trade Approval Sys') {
          targetNode = 'CLEARING HOUSE';
        } else if (sourceNode === 'JSCC') {
          targetNode = 'CLEARING HOUSE';
        }
      }
    } else {
      // For RECEIVE, the entity is the target, determine source from transType
      targetNode = transaction.entity;
      if (transaction.transType.includes('Trade Approval')) {
        sourceNode = 'Trade Approval Sys';
      } else if (transaction.transType.includes('CLEARING') || transaction.transType.includes('Clearing')) {
        sourceNode = 'CLEARING HOUSE';
      } else if (transaction.transType.includes('BOOKING')) {
        sourceNode = 'BOOKING SYSTEM';
      } else if (transaction.transType.includes('Affirmation')) {
        sourceNode = 'Affirmation System';
      } else {
        // Default routing based on target
        if (targetNode === 'CLEARING HOUSE') {
          sourceNode = 'Trade Approval Sys';
        } else if (targetNode === 'Trade Approval Sys') {
          sourceNode = 'CLEARING HOUSE';
        } else if (targetNode === 'JSCC') {
          sourceNode = 'Trade Approval Sys';
        }
      }
    }
    
    // Determine edge color based on exception status
    const edgeColor = transaction.exception && transaction.exception !== '' 
      ? '#dc2626' // red for errors
      : transaction.transStatus.includes('APPROVED') || transaction.transStatus.includes('GRANTED') || transaction.transStatus.includes('ACKNOWLEDGED')
      ? '#16a34a' // green for completed
      : transaction.transStatus.includes('PENDING') || transaction.transStatus.includes('ALLEGED')
      ? '#94a3b8' // gray for pending
      : '#2563eb'; // blue default
    
    return {
      id: `edge-${transaction.transId}`,
      source: sourceNode,
      target: targetNode,
      type: 'smoothstep',
      animated: false,
      label: `${transaction.step}`,
      labelStyle: { 
        fill: '#fff', 
        fontWeight: 700, 
        fontSize: 12,
        background: edgeColor,
        padding: '4px 8px',
        borderRadius: '4px',
      },
      labelBgStyle: { 
        fill: edgeColor, 
        fillOpacity: 1,
        rx: 4,
        ry: 4,
      },
      labelBgPadding: [6, 6] as [number, number],
      style: { stroke: edgeColor, strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      data: { transaction },
    };
  }).filter(edge => edge.source && edge.target); // Filter out edges with invalid source/target

  const onEdgeClick = (_event: any, edge: Edge) => {
    const transaction = edge.data?.transaction as Transaction;
    if (transaction) {
      setSelectedTransaction(transaction);
      if (transaction.exception && transaction.exception !== '') {
        setResolveDialogOpen(true);
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('APPROVED') || status.includes('GRANTED')) return 'bg-green-500';
    if (status.includes('REJECTED') || status.includes('REFUSED')) return 'bg-red-500';
    if (status.includes('PENDING') || status.includes('ALLEGED')) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTransactionBackgroundColor = (transaction: Transaction) => {
    // Error steps (has exception)
    if (transaction.exception && transaction.exception !== '') {
      return 'bg-red-50 border-red-300';
    }
    // Completed steps
    if (transaction.transStatus.includes('APPROVED') || 
        transaction.transStatus.includes('GRANTED') ||
        transaction.transStatus.includes('ACKNOWLEDGED') ||
        transaction.transStatus === 'RECEIVE' ||
        transaction.transStatus === 'SEND') {
      return 'bg-green-50 border-green-300';
    }
    // Pending/Incomplete steps
    if (transaction.transStatus.includes('PENDING') || 
        transaction.transStatus.includes('ALLEGED')) {
      return 'bg-slate-100 border-slate-300';
    }
    // Default to pending
    return 'bg-slate-100 border-slate-300';
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate({ to: '/search' })}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <CardTitle>Trade Clearing Flow Visualization</CardTitle>
                <CardDescription className="mt-2">
                  Interactive flow diagram and transaction timeline for {tradeId || 'selected trade'}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {tradeId || 'TRD-2024-00156'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Tabbed Flow Diagrams */}
        <Card className="h-[700px]">
          <Tabs defaultValue="system" className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system">System Flow Diagram</TabsTrigger>
                <TabsTrigger value="timeline">Timeline Flow Diagram</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <TabsContent value="system" className="flex-1 m-0 p-0">
              <CardContent className="h-[600px] p-0">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onEdgeClick={onEdgeClick}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Background />
                  <Controls />
                </ReactFlow>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="timeline" className="flex-1 m-0">
              <CardContent className="h-[600px] overflow-y-auto">
                <div className="space-y-4 px-4 py-2">
                  {mockTransactions.map((transaction, index) => {
                    const nextTransaction = mockTransactions[index + 1];
                    const bgColor = getTransactionBackgroundColor(transaction).split(' ')[0];
                    const borderColor = getTransactionBackgroundColor(transaction).split(' ')[1];
                    
                    return (
                      <div key={transaction.transId}>
                        <div
                          onClick={() => setSelectedTransaction(transaction)}
                          className={`relative pl-12 pb-4 cursor-pointer transition-all ${
                            selectedTransaction?.transId === transaction.transId
                              ? 'opacity-100'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                        >
                          {/* Timeline line and dot */}
                          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200">
                            {index === mockTransactions.length - 1 && (
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                            )}
                          </div>
                          <div className={`absolute left-2 top-2 w-5 h-5 rounded-full border-4 ${borderColor} ${bgColor} flex items-center justify-center`}>
                            <span className="text-[10px]">{transaction.step}</span>
                          </div>
                          
                          {/* Transaction Card */}
                          <div className={`border rounded-lg p-3 ${bgColor} ${borderColor} ${
                            selectedTransaction?.transId === transaction.transId
                              ? 'ring-2 ring-blue-500'
                              : ''
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm">{transaction.transId}</span>
                                  <Badge variant="outline" className="text-xs">Step {transaction.step}</Badge>
                                </div>
                                <p className="text-xs text-slate-600">{transaction.entity}</p>
                              </div>
                              <Badge 
                                variant={transaction.direction === 'SEND' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {transaction.direction}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowDownRight className="size-3 text-slate-500" />
                              <p className="text-xs text-slate-700">{transaction.transType}</p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Badge className={getStatusColor(transaction.transStatus) + ' text-xs'}>
                                {transaction.transStatus}
                              </Badge>
                              {transaction.exception && transaction.exception !== '' && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="size-3" />
                                  <span className="text-xs">Exception</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                              <Clock className="size-3" />
                              <span>{transaction.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right Side - Transaction Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                {selectedTransaction 
                  ? `Showing details for transaction ${selectedTransaction.transId}`
                  : 'Click on an arrow in the diagram to view transaction details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTransaction ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Transaction ID</p>
                      <p className="text-slate-900">{selectedTransaction.transId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Step</p>
                      <Badge variant="outline">{selectedTransaction.step}</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Entity</p>
                    <p className="text-slate-900">{selectedTransaction.entity}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Direction</p>
                      <Badge variant={selectedTransaction.direction === 'SEND' ? 'default' : 'secondary'}>
                        {selectedTransaction.direction}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Transaction Type</p>
                      <p className="text-sm text-slate-900">{selectedTransaction.transType}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <Badge className="bg-blue-600">{selectedTransaction.transStatus}</Badge>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Timestamp</p>
                    <p className="text-sm text-slate-900">{selectedTransaction.time}</p>
                  </div>

                  {selectedTransaction.exception && (
                    <>
                      <Separator />
                      
                      <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="size-5 text-red-600" />
                          <h3 className="font-semibold text-slate-900">Exception Details</h3>
                        </div>
                        
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Exception ID</p>
                          <p className="text-slate-900">{selectedTransaction.exception.id}</p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Event Reference</p>
                          <p className="text-slate-900">{selectedTransaction.exception.event}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Exception Type</p>
                          <p className="text-slate-900">{selectedTransaction.exception.exceptionMsg}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Priority</p>
                          <Badge 
                            variant={selectedTransaction.exception.priority === 'HIGH' ? 'destructive' : 'secondary'}
                            className={selectedTransaction.exception.priority === 'HIGH' ? 'bg-red-600' : ''}
                          >
                            {selectedTransaction.exception.priority}
                          </Badge>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Comments</p>
                          <p className="text-sm text-slate-900">{selectedTransaction.exception.comments}</p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">Exception Time</p>
                          <p className="text-sm text-slate-900">{selectedTransaction.exception.exceptionTime}</p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">Last Update</p>
                          <p className="text-sm text-slate-900">{selectedTransaction.exception.updateTime}</p>
                        </div>
                        
                        <Separator />
                        
                        <Button 
                          className="w-full bg-slate-900 hover:bg-slate-800"
                          onClick={() => {
                            navigate({ 
                              to: '/resolve', 
                              search: { exceptionId: selectedTransaction.exception!.id, from: 'flow' } 
                            });
                          }}
                        >
                          <Check className="size-4 mr-2" />
                          Resolve Exception
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <ArrowRight className="size-12 mx-auto mb-3" />
                  <p>Select a transaction arrow from the diagram</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Exception Resolution Dialog */}
      {selectedTransaction?.exception && (
        <AIResolveExceptionDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
          exception={{
            id: selectedTransaction.exception.id,
            event: selectedTransaction.exception.event,
            exceptionMsg: selectedTransaction.exception.exceptionMsg,
            comments: selectedTransaction.exception.comments,
            priority: selectedTransaction.exception.priority as 'HIGH' | 'MEDIUM' | 'LOW',
          }}
          solutions={solutions}
          onResolveWithExisting={(solutionId) => {
            // Increment solution score
            setSolutions(solutions.map(sol =>
              sol.id === solutionId
                ? { ...sol, scores: sol.scores + 1 }
                : sol
            ));
            
            setResolveDialogOpen(false);
            setSelectedTransaction(null);
          }}
          onResolveWithNew={(title, description) => {
            if (!selectedTransaction.exception) return;
            
            // Create new solution
            const newSolution: Solution = {
              id: Math.floor(100000 + Math.random() * 900000).toString(),
              title,
              exceptionDescription: 'USER INPUT',
              referenceEvent: selectedTransaction.exception.event,
              solutionDescription: description,
              createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
              scores: 1,
            };

            setSolutions([...solutions, newSolution]);
            
            setResolveDialogOpen(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
}