import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Zap, Database, Network, Clock } from 'lucide-react';

const DemoContainer = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const DemoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 20px;
`;

const DemoTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
`;

const ControlPanel = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const ControlButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  background: ${props => {
    switch (props.variant) {
      case 'primary': return 'linear-gradient(45deg, #00ff88, #00ccff)';
      case 'danger': return 'linear-gradient(45deg, #ff4444, #cc0000)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => props.variant === 'primary' ? '#000' : '#fff'};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ScenarioList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ScenarioCard = styled(motion.div)<{ active?: boolean }>`
  padding: 15px;
  border-radius: 12px;
  background: ${props => props.active 
    ? 'linear-gradient(45deg, rgba(0, 255, 136, 0.2), rgba(0, 204, 255, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'
  };
  border: 1px solid ${props => props.active ? '#00ff88' : 'rgba(255, 255, 255, 0.1)'};
  cursor: pointer;
`;

const ScenarioTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 5px;
`;

const ScenarioDescription = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin: 15px 0;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(45deg, #00ff88, #00ccff);
`;

const StatusIndicator = styled(motion.div)<{ status: 'running' | 'paused' | 'stopped' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'running': return 'linear-gradient(45deg, #00ff88, #00cc44)';
      case 'paused': return 'linear-gradient(45deg, #ffaa00, #ff8800)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => props.status === 'stopped' ? '#fff' : '#000'};
`;

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  operations: Array<{
    type: 'write' | 'read' | 'delete' | 'wait';
    key?: string;
    value?: string;
    node?: string;
    duration?: number;
    description: string;
  }>;
}

const scenarios: DemoScenario[] = [
  {
    id: 'basic-operations',
    title: 'Basic CRUD Operations',
    description: 'Demonstrates basic create, read, update, delete operations across the cluster',
    icon: Database,
    operations: [
      { type: 'write', key: 'user:john', value: 'John Doe', description: 'Writing user data' },
      { type: 'wait', duration: 1000, description: 'Replication in progress...' },
      { type: 'read', key: 'user:john', description: 'Reading from different node' },
      { type: 'write', key: 'user:jane', value: 'Jane Smith', description: 'Adding another user' },
      { type: 'read', key: 'user:jane', description: 'Verifying replication' },
      { type: 'delete', key: 'user:john', description: 'Deleting user data' },
    ]
  },
  {
    id: 'fault-tolerance',
    title: 'Fault Tolerance Demo',
    description: 'Shows how the system handles node failures and recovery',
    icon: Zap,
    operations: [
      { type: 'write', key: 'critical:data', value: 'Important data', description: 'Writing critical data' },
      { type: 'wait', duration: 2000, description: 'Simulating node failure...' },
      { type: 'read', key: 'critical:data', description: 'Reading despite node failure' },
      { type: 'write', key: 'recovery:test', value: 'Recovery successful', description: 'Writing during failure' },
      { type: 'wait', duration: 2000, description: 'Node recovery in progress...' },
      { type: 'read', key: 'recovery:test', description: 'Verifying data consistency' },
    ]
  },
  {
    id: 'performance-test',
    title: 'Performance Showcase',
    description: 'Rapid-fire operations to demonstrate system performance',
    icon: Network,
    operations: [
      { type: 'write', key: 'perf:1', value: 'Performance test 1', description: 'High-speed write 1' },
      { type: 'write', key: 'perf:2', value: 'Performance test 2', description: 'High-speed write 2' },
      { type: 'write', key: 'perf:3', value: 'Performance test 3', description: 'High-speed write 3' },
      { type: 'read', key: 'perf:1', description: 'Concurrent read 1' },
      { type: 'read', key: 'perf:2', description: 'Concurrent read 2' },
      { type: 'read', key: 'perf:3', description: 'Concurrent read 3' },
    ]
  },
  {
    id: 'vector-clocks',
    title: 'Vector Clock Causality',
    description: 'Demonstrates causality tracking with vector clocks',
    icon: Clock,
    operations: [
      { type: 'write', key: 'clock:a', value: 'Event A', description: 'Creating event A' },
      { type: 'write', key: 'clock:b', value: 'Event B', description: 'Creating concurrent event B' },
      { type: 'read', key: 'clock:a', description: 'Reading event A' },
      { type: 'write', key: 'clock:c', value: 'Event C depends on A', description: 'Creating causal event C' },
      { type: 'read', key: 'clock:c', description: 'Reading causally dependent event' },
    ]
  }
];

interface Props {
  onOperationExecute?: (operation: any) => void;
}

export const DemoMode: React.FC<Props> = ({ onOperationExecute }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<DemoScenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused && currentScenario) {
      interval = setInterval(() => {
        executeNextOperation();
      }, 2000); // Execute operation every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, currentScenario, currentStep]);

  const executeNextOperation = async () => {
    if (!currentScenario || currentStep >= currentScenario.operations.length) {
      setIsRunning(false);
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    const operation = currentScenario.operations[currentStep];
    
    try {
      if (operation.type === 'wait') {
        await new Promise(resolve => setTimeout(resolve, operation.duration || 1000));
      } else {
        // Execute actual API call
        await executeOperation(operation);
      }

      if (onOperationExecute) {
        onOperationExecute({
          ...operation,
          step: currentStep + 1,
          total: currentScenario.operations.length
        });
      }

      setCurrentStep(prev => prev + 1);
      setProgress(((currentStep + 1) / currentScenario.operations.length) * 100);
    } catch (error) {
      console.error('Demo operation failed:', error);
    }
  };

  const executeOperation = async (operation: any) => {
    const baseUrl = 'http://localhost:8081/api/v1';
    
    switch (operation.type) {
      case 'write':
        await fetch(`${baseUrl}/data/${operation.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: operation.value })
        });
        break;
      case 'read':
        await fetch(`${baseUrl}/data/${operation.key}`);
        break;
      case 'delete':
        await fetch(`${baseUrl}/data/${operation.key}`, {
          method: 'DELETE'
        });
        break;
    }
  };

  const startDemo = (scenario: DemoScenario) => {
    setCurrentScenario(scenario);
    setCurrentStep(0);
    setProgress(0);
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseDemo = () => {
    setIsPaused(!isPaused);
  };

  const stopDemo = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    setCurrentScenario(null);
  };

  const getStatus = () => {
    if (isRunning && !isPaused) return 'running';
    if (isRunning && isPaused) return 'paused';
    return 'stopped';
  };

  return (
    <DemoContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <DemoTitle>
        <Play size={20} />
        Interactive Demo Mode
      </DemoTitle>

      <ControlPanel>
        <ControlButton
          variant="primary"
          onClick={pauseDemo}
          disabled={!isRunning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          {isPaused ? 'Resume' : 'Pause'}
        </ControlButton>
        
        <ControlButton
          variant="danger"
          onClick={stopDemo}
          disabled={!isRunning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Square size={16} />
          Stop
        </ControlButton>

        <StatusIndicator
          status={getStatus()}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            backgroundColor: getStatus() === 'stopped' ? '#fff' : '#000',
            animation: getStatus() === 'running' ? 'pulse 2s infinite' : 'none'
          }} />
          {getStatus().charAt(0).toUpperCase() + getStatus().slice(1)}
        </StatusIndicator>
      </ControlPanel>

      {currentScenario && isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ color: '#00ff88', fontSize: '0.9rem', marginBottom: 8 }}>
            Current: {currentScenario.title}
          </div>
          {currentStep < currentScenario.operations.length && (
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
              Step {currentStep + 1}/{currentScenario.operations.length}: {' '}
              {currentScenario.operations[currentStep]?.description}
            </div>
          )}
          <ProgressBar>
            <ProgressFill
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </ProgressBar>
        </motion.div>
      )}

      <ScenarioList>
        {scenarios.map((scenario) => {
          const IconComponent = scenario.icon;
          return (
            <ScenarioCard
              key={scenario.id}
              active={currentScenario?.id === scenario.id}
              onClick={() => !isRunning && startDemo(scenario)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ opacity: isRunning && currentScenario?.id !== scenario.id ? 0.5 : 1 }}
            >
              <ScenarioTitle>
                <IconComponent size={16} style={{ display: 'inline', marginRight: 8 }} />
                {scenario.title}
              </ScenarioTitle>
              <ScenarioDescription>
                {scenario.description}
              </ScenarioDescription>
            </ScenarioCard>
          );
        })}
      </ScenarioList>
    </DemoContainer>
  );
};