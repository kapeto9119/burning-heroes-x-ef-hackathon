'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Workflow, ArrowLeft, SendIcon, Sparkles, Command, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Renderer, Program, Mesh, Triangle, Color } from 'ogl';

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn('relative', containerClassName)}>
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'transition-all duration-200 ease-in-out',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            showRing
              ? 'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
              : '',
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-primary/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface ThreadsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  color?: [number, number, number];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
}

const vertexShader = `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float iTime;
  uniform vec3 iResolution;
  uniform vec3 uColor;
  uniform float uAmplitude;
  uniform float uDistance;
  uniform vec2 uMouse;

  #define PI 3.1415926538

  const int u_line_count = 40;
  const float u_line_width = 7.0;
  const float u_line_blur = 10.0;

  float Perlin2D(vec2 P) {
      vec2 Pi = floor(P);
      vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
      vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
      Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
      Pt += vec2(26.0, 161.0).xyxy;
      Pt *= Pt;
      Pt = Pt.xzxz * Pt.yyww;
      vec4 hash_x = fract(Pt * (1.0 / 951.135664));
      vec4 hash_y = fract(Pt * (1.0 / 642.949883));
      vec4 grad_x = hash_x - 0.49999;
      vec4 grad_y = hash_y - 0.49999;
      vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
          * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
      grad_results *= 1.4142135623730950;
      vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
                 * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
      vec4 blend2 = vec4(blend, vec2(1.0 - blend));
      return dot(grad_results, blend2.zxzx * blend2.wwyy);
  }

  float pixel(float count, vec2 resolution) {
      return (1.0 / max(resolution.x, resolution.y)) * count;
  }

  float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
      float split_offset = (perc * 0.4);
      float split_point = 0.1 + split_offset;

      float amplitude_normal = smoothstep(split_point, 0.7, st.x);
      float amplitude_strength = 0.5;
      float finalAmplitude = amplitude_normal * amplitude_strength
                             * amplitude * (1.0 + (mouse.y - 0.5) * 0.2); 

      float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
      float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

      float xnoise = mix(
          Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
          Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
          st.x * 0.3
      );

      float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

      float line_start = smoothstep(
          y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
          y,
          st.y
      );

      float line_end = smoothstep(
          y,
          y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
          st.y
      );

      return clamp(
          (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
          0.0,
          1.0
      );
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;

      float line_strength = 1.0;
      for (int i = 0; i < u_line_count; i++) {
          float p = float(i) / float(u_line_count);
          line_strength *= (1.0 - lineFn(
              uv,
              u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
              p,
              (PI * 1.0) * p,
              uMouse,
              iTime,
              uAmplitude,
              uDistance
          ));
      }

      float colorVal = 1.0 - line_strength;
      fragColor = vec4(uColor * colorVal, colorVal);
  }

  void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
  }
`;

const Threads: React.FC<ThreadsProps> = ({
  color = [1, 1, 1],
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
  className,
  style,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uColor: { value: new Color(...color) },
        uAmplitude: { value: amplitude },
        uDistance: { value: distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!containerRef.current || !rendererRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      rendererRef.current.setSize(clientWidth, clientHeight);
      program.uniforms.iResolution.value.r =
        clientWidth * rendererRef.current.dpr;
      program.uniforms.iResolution.value.g =
        clientHeight * rendererRef.current.dpr;
      program.uniforms.iResolution.value.b = clientWidth / (clientHeight || 1);
    }
    window.addEventListener('resize', resize);
    resize();

    let currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouse = [x, y];
    }

    function handleMouseLeave() {
      targetMouse = [0.5, 0.5];
    }

    if (enableMouseInteraction) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    function update(t: number) {
      animationFrameId.current = requestAnimationFrame(update);

      if (enableMouseInteraction) {
        const smoothing = 0.05;
        currentMouse[0] += smoothing * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += smoothing * (targetMouse[1] - currentMouse[1]);
        program.uniforms.uMouse.value[0] = currentMouse[0];
        program.uniforms.uMouse.value[1] = currentMouse[1];
      } else {
        program.uniforms.uMouse.value[0] = 0.5;
        program.uniforms.uMouse.value[1] = 0.5;
      }
      program.uniforms.iTime.value = t * 0.001;

      renderer.render({ scene: mesh });
    }
    animationFrameId.current = requestAnimationFrame(update);

    program.uniforms.uColor.value.set(...color);
    program.uniforms.uAmplitude.value = amplitude;
    program.uniforms.uDistance.value = distance;

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', resize);

      if (enableMouseInteraction) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }

      const currentRenderer = rendererRef.current;
      if (currentRenderer) {
        const currentGl = currentRenderer.gl;
        if (
          currentGl &&
          currentGl.canvas &&
          container.contains(currentGl.canvas)
        ) {
          container.removeChild(currentGl.canvas);
        }
        const loseContextExtension = currentGl.getExtension(
          'WEBGL_lose_context'
        );
        if (loseContextExtension) {
          loseContextExtension.loseContext();
        }
      }
      rendererRef.current = null;
    };
  }, [color, amplitude, distance, enableMouseInteraction]);

  return (
    <div ref={containerRef} className={className} style={style} {...rest} />
  );
};

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-foreground rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [value, setValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  const commandSuggestions: CommandSuggestion[] = [
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Generate',
      description: 'Create new workflow',
      prefix: '/generate',
    },
    {
      icon: <Command className="w-4 h-4" />,
      label: 'Analyze',
      description: 'Analyze workflow',
      prefix: '/analyze',
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Optimize',
      description: 'Improve workflow',
      prefix: '/optimize',
    },
  ];

  useEffect(() => {
    if (value.startsWith('/') && !value.includes(' ')) {
      setShowCommandPalette(true);

      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) =>
        cmd.prefix.startsWith(value)
      );

      if (matchingSuggestionIndex >= 0) {
        setActiveSuggestion(matchingSuggestionIndex);
      } else {
        setActiveSuggestion(-1);
      }
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector('[data-command-button]');

      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < commandSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : commandSuggestions.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion];
          setValue(selectedCommand.prefix + ' ');
          setShowCommandPalette(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleSendMessage = () => {
    if (value.trim()) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setValue('');
        adjustHeight(true);
      }, 3000);
    }
  };

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index];
    setValue(selectedCommand.prefix + ' ');
    setShowCommandPalette(false);
  };

  return (
    <div className="min-h-screen flex flex-col w-full items-center bg-background text-foreground relative overflow-hidden">
      {/* Background Threads */}
      <div className="absolute inset-0 w-full h-full">
        <Threads
          className="w-full h-full"
          amplitude={0.5}
          distance={0.03}
          enableMouseInteraction={true}
          color={[0.5, 0.5, 1.0]}
        />
      </div>

      {/* Navigation */}
      <nav className="sticky top-4 z-50 px-4 w-full">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-lg px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  WorkflowAI
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full">
                <Workflow className="w-4 h-4 mr-2" />
                View Graph
              </Button>
              <Button size="sm" className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md">
                Save Workflow
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Chat Content */}
      <div className="w-full max-w-2xl mx-auto relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          className="relative space-y-12 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-4xl font-light tracking-tight text-foreground/90 pb-1">
                What's up nerd, what do you wanna automate today?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Type / for commands
            </motion.p>
          </div>

          <motion.div
            className="relative backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AnimatePresence>
              {showCommandPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-background/95 rounded-lg z-50 shadow-lg border border-border overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1">
                    {commandSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer',
                          activeSuggestion === index
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-accent'
                        )}
                        onClick={() => selectCommandSuggestion(index)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          {suggestion.icon}
                        </div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className="text-muted-foreground text-xs ml-1">
                          {suggestion.prefix}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                containerClassName="w-full"
                className={cn(
                  'w-full px-4 py-3',
                  'resize-none',
                  'bg-transparent',
                  'border-none',
                  'text-foreground text-sm',
                  'focus:outline-none',
                  'placeholder:text-muted-foreground',
                  'min-h-[60px]'
                )}
                style={{
                  overflow: 'hidden',
                }}
                showRing={false}
              />
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  data-command-button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommandPalette((prev) => !prev);
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    'p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors relative group',
                    showCommandPalette && 'bg-accent text-foreground'
                  )}
                >
                  <Command className="w-4 h-4" />
                </motion.button>
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isTyping || !value.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  'flex items-center gap-2',
                  value.trim()
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-accent text-muted-foreground'
                )}
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => selectCommandSuggestion(index)}
                className="flex items-center gap-2 px-3 py-2 bg-accent/50 hover:bg-accent rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all relative group border border-border/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 backdrop-blur-xl bg-background/80 rounded-full px-4 py-2 shadow-lg border border-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
