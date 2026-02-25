package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type ContainerInfo struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	State   string            `json:"state"`
	Status  string            `json:"status"`
	Created int64             `json:"created"`
	Ports   []PortMapping     `json:"ports"`
	Labels  map[string]string `json:"labels"`
}

type PortMapping struct {
	PrivatePort uint16 `json:"privatePort"`
	PublicPort  uint16 `json:"publicPort"`
	Type        string `json:"type"`
}

type ContainerStats struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryUsage   uint64  `json:"memoryUsage"`
	MemoryLimit   uint64  `json:"memoryLimit"`
	MemoryPercent float64 `json:"memoryPercent"`
	NetworkRx     uint64  `json:"networkRx"`
	NetworkTx     uint64  `json:"networkTx"`
}

type DockerStatusMessage struct {
	Containers []ContainerInfo  `json:"containers"`
	Stats      []ContainerStats `json:"stats"`
	Timestamp  time.Time        `json:"timestamp"`
}

var dockerClient *client.Client
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 本番環境では適切なオリジンチェックを実装
	},
}

func main() {
	var err error
	dockerClient, err = client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to create Docker client: %v", err)
	}
	defer dockerClient.Close()

	router := mux.NewRouter()

	// CORS middleware
	router.Use(corsMiddleware)

	// Routes
	router.HandleFunc("/api/docker/containers", getContainers).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/docker/stats", getAllStats).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/docker/stats/{id}", getContainerStats).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/docker/ws", handleWebSocket)
	router.HandleFunc("/api/health", healthCheck).Methods("GET", "OPTIONS")

	port := "4000"
	log.Printf("Starting Go server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func getContainers(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var containerInfos []ContainerInfo
	for _, ctr := range containers {
		ports := []PortMapping{}
		for _, port := range ctr.Ports {
			ports = append(ports, PortMapping{
				PrivatePort: port.PrivatePort,
				PublicPort:  port.PublicPort,
				Type:        port.Type,
			})
		}

		name := ""
		if len(ctr.Names) > 0 {
			name = ctr.Names[0]
			if len(name) > 0 && name[0] == '/' {
				name = name[1:]
			}
		}

		containerInfos = append(containerInfos, ContainerInfo{
			ID:      ctr.ID[:12],
			Name:    name,
			Image:   ctr.Image,
			State:   ctr.State,
			Status:  ctr.Status,
			Created: ctr.Created,
			Ports:   ports,
			Labels:  ctr.Labels,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(containerInfos)
}

func getAllStats(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var stats []ContainerStats
	for _, ctr := range containers {
		stat, err := getContainerStatByID(ctx, ctr.ID)
		if err != nil {
			log.Printf("Error getting stats for container %s: %v", ctr.ID, err)
			continue
		}

		name := ""
		if len(ctr.Names) > 0 {
			name = ctr.Names[0]
			if len(name) > 0 && name[0] == '/' {
				name = name[1:]
			}
		}

		stat.Name = name
		stats = append(stats, stat)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func getContainerStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	containerID := vars["id"]

	ctx := context.Background()
	stat, err := getContainerStatByID(ctx, containerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stat)
}

func getContainerStatByID(ctx context.Context, containerID string) (ContainerStats, error) {
	stats, err := dockerClient.ContainerStats(ctx, containerID, false)
	if err != nil {
		return ContainerStats{}, err
	}
	defer stats.Body.Close()

	var containerStats types.StatsJSON
	if err := json.NewDecoder(stats.Body).Decode(&containerStats); err != nil {
		return ContainerStats{}, err
	}

	cpuPercent := calculateCPUPercent(&containerStats)
	memoryPercent := calculateMemoryPercent(&containerStats)

	networkRx, networkTx := calculateNetwork(&containerStats)

	return ContainerStats{
		ID:            containerID[:12],
		CPUPercent:    cpuPercent,
		MemoryUsage:   containerStats.MemoryStats.Usage,
		MemoryLimit:   containerStats.MemoryStats.Limit,
		MemoryPercent: memoryPercent,
		NetworkRx:     networkRx,
		NetworkTx:     networkTx,
	}, nil
}

func calculateCPUPercent(stats *types.StatsJSON) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)

	if systemDelta > 0 && cpuDelta > 0 {
		return (cpuDelta / systemDelta) * float64(len(stats.CPUStats.CPUUsage.PercpuUsage)) * 100.0
	}
	return 0.0
}

func calculateMemoryPercent(stats *types.StatsJSON) float64 {
	if stats.MemoryStats.Limit > 0 {
		return float64(stats.MemoryStats.Usage) / float64(stats.MemoryStats.Limit) * 100.0
	}
	return 0.0
}

func calculateNetwork(stats *types.StatsJSON) (uint64, uint64) {
	var rx, tx uint64
	for _, network := range stats.Networks {
		rx += network.RxBytes
		tx += network.TxBytes
	}
	return rx, tx
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	log.Println("New WebSocket client connected")

	// 定期的にDocker情報を送信（2秒ごと）
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Pingメッセージを受信するゴルーチン
	var mu sync.Mutex
	go func() {
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				cancel()
				return
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			msg, err := getDockerStatus()
			if err != nil {
				log.Printf("Error getting Docker status: %v", err)
				continue
			}

			mu.Lock()
			err = conn.WriteJSON(msg)
			mu.Unlock()

			if err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}

func getDockerStatus() (*DockerStatusMessage, error) {
	ctx := context.Background()

	// コンテナ情報を取得
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var containerInfos []ContainerInfo
	var stats []ContainerStats

	for _, ctr := range containers {
		ports := []PortMapping{}
		for _, port := range ctr.Ports {
			ports = append(ports, PortMapping{
				PrivatePort: port.PrivatePort,
				PublicPort:  port.PublicPort,
				Type:        port.Type,
			})
		}

		name := ""
		if len(ctr.Names) > 0 {
			name = ctr.Names[0]
			if len(name) > 0 && name[0] == '/' {
				name = name[1:]
			}
		}

		containerInfos = append(containerInfos, ContainerInfo{
			ID:      ctr.ID[:12],
			Name:    name,
			Image:   ctr.Image,
			State:   ctr.State,
			Status:  ctr.Status,
			Created: ctr.Created,
			Ports:   ports,
			Labels:  ctr.Labels,
		})

		// 実行中のコンテナのみ統計情報を取得
		if ctr.State == "running" {
			stat, err := getContainerStatByID(ctx, ctr.ID)
			if err != nil {
				log.Printf("Error getting stats for container %s: %v", ctr.ID, err)
				continue
			}
			stat.Name = name
			stats = append(stats, stat)
		}
	}

	return &DockerStatusMessage{
		Containers: containerInfos,
		Stats:      stats,
		Timestamp:  time.Now(),
	}, nil
}
