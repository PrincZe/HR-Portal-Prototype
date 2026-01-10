'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string;
  location: string | null;
  meeting_type: 'hrl_ministry' | 'hrl_statboard' | 'hrl_all';
  rsvps?: any[];
  minutes?: any[];
}

interface RSVP {
  id: string;
  status: 'attending' | 'not_attending' | 'maybe';
}

interface MeetingCardProps {
  meeting: Meeting;
  userRSVP?: RSVP;
  canManage: boolean;
  onRSVP: (meetingId: string, status: 'attending' | 'not_attending' | 'maybe') => void;
  onClick: () => void;
  isPast?: boolean;
}

export function MeetingCard({ meeting, userRSVP, canManage, onRSVP, onClick, isPast }: MeetingCardProps) {
  const getTypeBadge = (type: string) => {
    const config = {
      hrl_ministry: { label: 'Ministry', className: 'bg-blue-100 text-blue-800' },
      hrl_statboard: { label: 'Stat Board', className: 'bg-green-100 text-green-800' },
      hrl_all: { label: 'All HRL', className: 'bg-purple-100 text-purple-800' },
    };
    const badge = config[type as keyof typeof config] || config.hrl_all;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getRSVPCounts = () => {
    const attending = meeting.rsvps?.filter(r => r.status === 'attending').length || 0;
    const total = meeting.rsvps?.length || 0;
    return { attending, total };
  };

  const { attending, total } = getRSVPCounts();

  const handleRSVPClick = (e: React.MouseEvent, status: 'attending' | 'not_attending' | 'maybe') => {
    e.stopPropagation();
    onRSVP(meeting.id, status);
  };

  return (
    <Card 
      className={`flex flex-col hover:shadow-lg transition-shadow cursor-pointer ${
        isPast ? 'opacity-75' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          {getTypeBadge(meeting.meeting_type)}
          {meeting.minutes && meeting.minutes.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Minutes Available
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg line-clamp-2">{meeting.title}</CardTitle>
        {meeting.description && (
          <CardDescription className="line-clamp-2">{meeting.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(meeting.meeting_date), 'EEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(`2000-01-01T${meeting.meeting_time}`), 'h:mm a')}</span>
          </div>
          {meeting.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{meeting.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{attending} attending{total > 0 && ` / ${total} responded`}</span>
          </div>
        </div>

        {userRSVP && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              {userRSVP.status === 'attending' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">You're attending</span>
                </>
              )}
              {userRSVP.status === 'not_attending' && (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">Not attending</span>
                </>
              )}
              {userRSVP.status === 'maybe' && (
                <>
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600 font-medium">Maybe</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {!isPast && (
        <CardFooter className="flex gap-2">
          <Button
            onClick={(e) => handleRSVPClick(e, 'attending')}
            variant={userRSVP?.status === 'attending' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Yes
          </Button>
          <Button
            onClick={(e) => handleRSVPClick(e, 'maybe')}
            variant={userRSVP?.status === 'maybe' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            <HelpCircle className="mr-1 h-3 w-3" />
            Maybe
          </Button>
          <Button
            onClick={(e) => handleRSVPClick(e, 'not_attending')}
            variant={userRSVP?.status === 'not_attending' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            <XCircle className="mr-1 h-3 w-3" />
            No
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
