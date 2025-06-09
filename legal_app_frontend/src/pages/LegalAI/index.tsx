import React from 'react';
import { Container, Row, Col, Card, Tabs, Tab } from 'react-bootstrap';
import LegalTextCompletion from '../../components/LegalTextCompletion';
import LegalDocumentSimilarity from '../../components/LegalDocumentSimilarity';
import LegalTextAnalysis from '../../components/LegalTextAnalysis';

const LegalAI: React.FC = () => {
  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>Legal AI Tools</h1>
          <p className="text-muted">
            Powered by InLegalBERT - specialized for Indian legal text analysis
          </p>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Tabs defaultActiveKey="completion" className="mb-4">
                <Tab eventKey="completion" title="Text Completion">
                  <LegalTextCompletion />
                </Tab>
                <Tab eventKey="similarity" title="Document Similarity">
                  <LegalDocumentSimilarity />
                </Tab>
                <Tab eventKey="analysis" title="Text Analysis">
                  <LegalTextAnalysis />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LegalAI;
